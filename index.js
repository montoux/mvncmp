/*
 * Copyright 2019 Montoux
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at :
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

"use strict";

(function (module) {

    /// ================================================================================================================
    /// Helper Functions
    /// ================================================================================================================


    /// Check if the character is a digit.
    function isDigit(ch) {
        return /^[0-9]$/.test(ch);
    }


    /// These special qualifiers are recognised either as pre-releases, releases, or post-releases.
    const QUALIFIERS = ["alpha", "beta", "milestone", "rc", "snapshot", "", "sp"];
    const RELEASE_VERSION_INDEX = QUALIFIERS.indexOf("").toString();


    /// The above qualifiers are recognised as pre-releases and are ordered before the major release.
    /// Any qualifier not recognised above is considered a post-release.
    /// This function turns a qualifier string into a string will be ordered appropriately under comparison.
    function comparableQualifier(qualifier) {
        let i = QUALIFIERS.indexOf(qualifier);
        if (i === -1) {
            return QUALIFIERS.length + "-" + qualifier;
        } else {
            return i.toString();
        }
    }


    /// ================================================================================================================
    /// Tokens
    /// ================================================================================================================


    /// A version string is parsed into a ListItem, which may be composed of IntItems, StringItems, and other ListItems.
    /// This object serves as an enum for identifying the type of items.
    function IntItem(str) {
        this.value = parseInt(str, 10);
    }


    IntItem.prototype.isNull = function () {
        return this.value === 0;
    };


    IntItem.prototype.compareTo = function (other) {
        if (!other) {
            return this.value === 0 ? 0 : 1; // 1.0 == 1, 1.1 > 1
        } else if (other instanceof IntItem) {
            return (this.value < other.value) ? -1 : (this.value === other.value) ? 0 : 1;
        } else if (other instanceof StringItem) {
            return 1; // 1.1 > 1-sp
        } else if (other instanceof ListItem) {
            return 1; // 1.1 > 1-1
        } else {
            throw new Error("Bad comparison between IntItem and " + other);
        }
    };


    const ZERO = new IntItem("0");


    function StringItem(str, isFollowedByDigit) {
        if (isFollowedByDigit && str.length === 1) {
            str = StringItem.SHORTHANDS[str[0]] || str;
        }
        this.value = StringItem.ALIASES[str] === undefined ? str : StringItem.ALIASES[str];
    }


    StringItem.ALIASES = {
        "ga": "",
        "final": "",
        "release": "",
        "cr": "rc"
    };


    StringItem.SHORTHANDS = {
        "a": "alpha",
        "b": "beta",
        "m": "milestone"
    };


    StringItem.prototype.isNull = function () {
        return comparableQualifier(this.value).localeCompare(RELEASE_VERSION_INDEX) === 0;
    };


    StringItem.prototype.compareTo = function (other) {
        if (!other) {
            // depends on if this string is a recognised pre-release: 1-rc < 1 < 1-ga
            return comparableQualifier(this.value).localeCompare(RELEASE_VERSION_INDEX);
        } else if (other instanceof IntItem) {
            return -1; // 1.x < 1.1
        } else if (other instanceof StringItem) {
            return comparableQualifier(this.value).localeCompare(comparableQualifier(other.value));
        } else if (other instanceof ListItem) {
            return -1; // dot take precedence: 1.x < 1-1
        } else {
            throw new Error("Bad comparison between StringItem and " + other);
        }
    };


    function ListItem() {
        this.data = [];
    }


    ListItem.prototype.isNull = function () {
        return this.data.length === 0;
    };


    /// Removes any trailing "null" elements.
    ListItem.prototype.normalise = function () {
        for (let i = this.data.length - 1; i >= 0; i--) {
            if (this.data[i].isNull()) {
                this.data.splice(i, 1);
            } else if (!(this.data[i] instanceof ListItem)) {
                break;
            }
        }
    };


    /// Append a token/item onto this ListItem.
    ListItem.prototype.push = function (item) {
        this.data.push(item);
    };


    ListItem.prototype.compareTo = function (other) {
        if (!other) {
            if (this.data.length === 0) {
                return 0; // 1-0 = 1-[normalises to empty] = 1
            } else {
                return this.data[0].compareTo(null);
            }
        } else if (other instanceof IntItem) {
            return -1; // 1-1 < 1.0.x
        } else if (other instanceof StringItem) {
            return -1; // 1-1 > 1-sp
        } else if (other instanceof ListItem) {
            let left = this.data;
            let right = other.data;
            for (let i = 0; ; i++) {
                let l = (i < left.length) ? left[i] : null;
                let r = (i < right.length) ? right[i] : null;

                // Finished comparing elements of both lists; they must be the same.
                if (l === null && r === null) {
                    return 0;
                }

                // Be careful not to call `compareTo` on `null`.
                let comparison;
                if (l === null && r === null) {
                    comparison = 0;
                } else if (l === null && r !== null) {
                    comparison = -1 * r.compareTo(l); // flipped order of comparison, so multiply by -1
                } else {
                    comparison = l.compareTo(r); // either both non-nil, or right is non-nil
                }

                // If two items not equivalent, return comparison. Otherwise loop again to check next pair of items.
                if (comparison !== 0) {
                    return comparison;
                }
            }
        } else {
            throw new Error("Bad comparison between ListItem and " + other);
        }
    };


    /// ================================================================================================================
    /// Parsing Functions
    /// ================================================================================================================


    /// Strips the leading zeroes from a string. If the string is all zeroes or null, then "0" is returned.
    function stripLeadingZeroes(s) {
        if (s === null || s.length === 0) {
            return "0";
        } else {
            for (let i = 0; i < s.length; i++) {
                if (s[i] !== "0") {
                    return s.substring(i);
                }
            }
            return s; // nothing to strip
        }
    }


    function parseItem(isDigit, s) {
        if (isDigit) {
            return new IntItem(stripLeadingZeroes(s));
        } else {
            return new StringItem(s, false);
        }
    }


    function ComparableVersion(version) {

        this.value = version;
        this.items = new ListItem();

        version = version.toLowerCase();
        let list = this.items;
        let stack = []; // keep references to all the lists we make, so we can normalise them at the end
        stack.push(list);
        let isInsideDigit = false;
        let startIndex = 0;

        for (let i = 0; i < version.length; i++) {

            if (version[i] === ".") {
                if (i === startIndex) {
                    list.push(ZERO);
                } else {
                    list.push(parseItem(isInsideDigit, version.substring(startIndex, i)));
                }
                startIndex = i + 1;
            }

            else if (version[i] === "-") {

                if (i === startIndex) {
                    list.push(ZERO);
                } else {
                    list.push(parseItem(isInsideDigit, version.substring(startIndex, i)));
                }
                startIndex = i + 1;
                list.push(list = new ListItem());
                stack.push(list);
            }

            else if (isDigit(version[i])) {
                if (!isInsideDigit && i > startIndex) {
                    list.push(new StringItem(version.substring(startIndex, i), true));
                    startIndex = i;
                    list.push(list = new ListItem());
                    stack.push(list);
                }
                isInsideDigit = true;
            }

            else {
                if (isInsideDigit && i > startIndex) {
                    list.push(parseItem(true, version.substring(startIndex, i)));
                    startIndex = i;
                    list.push(list = new ListItem());
                    stack.push(list);
                }
                isInsideDigit = false;
            }

        }

        // Parse the last item
        if (version.length > startIndex) {
            list.push(parseItem(isInsideDigit, version.substring(startIndex)));
        }

        while (stack.length !== 0) {
            list = stack.pop();
            list.normalise();
        }

    }


    ComparableVersion.prototype.compareTo = function (other) {
        return this.items.compareTo(other.items);
    };


    /// ================================================================================================================
    /// Public Functions
    /// ================================================================================================================

    /// Compare two version strings.
    ///   * If version1 < version2, returns <0
    ///   * If version1 = version2, returns =0
    ///   * If version1 > version2, returns >0
    function compare(v1, v2) {
        return new ComparableVersion(v1).compareTo(new ComparableVersion(v2));
    }

    module.exports = {compare: compare};

}(module));
