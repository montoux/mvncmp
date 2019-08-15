'use strict';

const chai = require('chai');
var expect = chai.expect;

const mocha = require('mocha');
var describe = mocha.describe;

const mvncmp = require('../index.js');
var cmp = mvncmp.compare;


function check_eq(v1, v2) {
    const msg = "'" + v1 + "'" + " === " + "'" + v2 + "'";
    it(msg, function () {
        expect(cmp(v1, v2)).to.equal(0);
        expect(cmp(v2, v1)).to.equal(0);
    });
}


function check_lt(v1, v2) {
    const msg = "'" + v1 + "'" + " < " + "'" + v2 + "'";
    it(msg, function () {
        expect(cmp(v1, v2)).to.be.below(0);
        expect(cmp(v2, v1)).to.be.above(0);
    });
}


describe("Equality (Normalisation)", function () {
    check_eq("1", "1");
    check_eq("1", "1.0");
    check_eq("1", "1.0.0");
    check_eq("1", "1-0");
    check_eq("1", "1.0-0");
    check_eq("1.0", "1.0-0");
    check_eq("1a", "1-a");
    check_eq("1a", "1.0-a");
    check_eq("1a", "1.0.0-a");
    check_eq("1.0a", "1-a");
    check_eq("1.0.0a", "1-a");
    check_eq("1x", "1-x");
    check_eq("1x", "1.0-x");
    check_eq("1x", "1.0.0-x");
    check_eq("1.0x", "1-x");
    check_eq("1.0.0x", "1-x");
});


describe("Equality (Aliasing)", function () {
    check_eq("1ga", "1");
    check_eq("1release", "1");
    check_eq("1final", "1");
    check_eq("1cr", "1rc");
    check_eq("1a1", "1-alpha-1");
    check_eq("1b2", "1-beta-2");
    check_eq("1m3", "1-milestone-3");
});


describe("Equality (Case Insensitivity)", function () {
    check_eq("1X", "1x");
    check_eq("1A", "1a");
    check_eq("1B", "1b");
    check_eq("1M", "1m");
    check_eq("1Ga", "1");
    check_eq("1GA", "1");
    check_eq("1RELEASE", "1");
    check_eq("1release", "1");
    check_eq("1RELeaSE", "1");
    check_eq("1Final", "1");
    check_eq("1FinaL", "1");
    check_eq("1FINAL", "1");
    check_eq("1Cr", "1Rc");
    check_eq("1cR", "1rC");
    check_eq("1m3", "1Milestone3");
    check_eq("1m3", "1Milestone3");
    check_eq("1m3", "1MILESTONE3");
});


describe("Version Comparison", function () {
    check_lt("1", "2");
    check_lt("1.5", "2");
    check_lt("1", "2.5");
    check_lt("1.0", "1.1");
    check_lt("1.1", "1.2");
    check_lt("1.0.0", "1.1");
    check_lt("1.0.1", "1.1");
    check_lt("1.1", "1.2.0");
    check_lt("1.0-alpha-1", "1.0");
    check_lt("1.0-alpha-1", "1.0-alpha-2");
    check_lt("1.0-alpha-1", "1.0-beta-1");
    check_lt("1.0-beta-1", "1.0-SNAPSHOT");
    check_lt("1.0-SNAPSHOT", "1.0");
    check_lt("1.0-alpha-1-SNAPSHOT", "1.0-alpha-1");
    check_lt("1.0", "1.0-1");
    check_lt("1.0-1", "1.0-2");
    check_lt("1.0.0", "1.0-1");
    check_lt("2.0-1", "2.0.1");
    check_lt("2.0.1-klm", "2.0.1-lmn");
    check_lt("2.0.1", "2.0.1-xyz");
    check_lt("2.0.1", "2.0.1-123");
    check_lt("2.0.1-xyz", "2.0.1-123");
});


describe("Edge Cases", function () {
    // https://issues.apache.org/jira/browse/MNG-5568
    check_lt("6.1.0rc3", "6.1.0");
    check_lt("6.1.0rc3", "6.1H.5-beta");
    check_lt("6.1.0", "6.1H.5-beta");
});
