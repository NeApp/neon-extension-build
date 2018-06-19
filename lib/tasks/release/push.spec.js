"use strict";

var _push = require("./push");

describe('Tasks', function () {
  describe('release:push', function () {
    describe('getTargetBranches', function () {
      it('v1.9.0-beta.1', function () {
        expect((0, _push.getTargetBranches)('v1.9.0-beta.1')).toEqual(['develop', 'v1.9']);
      });
      it('v1.9.0', function () {
        expect((0, _push.getTargetBranches)('v1.9.0')).toEqual(['develop', 'v1.9', 'master']);
      });
      it('v1.9.1-beta.1', function () {
        expect((0, _push.getTargetBranches)('v1.9.1-beta.1')).toEqual(['v1.9']);
      });
      it('v1.9.1', function () {
        expect((0, _push.getTargetBranches)('v1.9.1')).toEqual(['v1.9', 'master']);
      });
    });
  });
});