"use strict";

var _npm = require("./npm");

describe('Commands', function () {
  describe('install:travis', function () {
    describe('getBranches', function () {
      it('should handle default branches', function () {
        expect((0, _npm.getBranches)('develop')).toEqual(['develop', 'master']);
        expect((0, _npm.getBranches)('master')).toEqual(['master', 'develop']);
      });
      it('should handle unknown branches', function () {
        expect((0, _npm.getBranches)('feature/test')).toEqual(['feature/test', 'develop', 'master']);
      });
      it('should handle version tags', function () {
        expect((0, _npm.getBranches)('v1.0.0')).toEqual(['v1.0.0', 'master']);
      });
    });
  });
});