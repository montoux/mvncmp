# mvncmp

This is a Javascript implementation of Maven 3's [ComparableVersion](http://maven.apache.org/ref/3.0/maven-artifact/xref/org/apache/maven/artifact/versioning/ComparableVersion.html),
for comparing version strings.

 * Written in ECMA 5.1 to be IE11-compatible.
 * Written to mirror the original Java as closely as possible.

See also Apache's wiki on Maven versioning: https://cwiki.apache.org/confluence/display/MAVENOLD/Versioning

## Tests

The tests are written using [Chai](https://www.chaijs.com/) and executed via [Mocha](https://mochajs.org/). Run them with `npm test`.
