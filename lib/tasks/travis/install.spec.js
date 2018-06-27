"use strict";

var _install = require("./install");

describe('Commands', function () {
  describe('install:travis', function () {
    describe('getBranches', function () {
      it('master', function () {
        expect((0, _install.getBranches)('master')).toEqual(['master', 'develop']);
      });
      it('develop', function () {
        expect((0, _install.getBranches)('develop')).toEqual(['develop', 'master']);
      });
      it('feature/test', function () {
        expect((0, _install.getBranches)('feature/test')).toEqual(['feature/test', 'develop', 'master']);
      });
      it('v1.9.0', function () {
        expect((0, _install.getBranches)('v1.9.0')).toEqual(['v1.9.0', 'master']);
      });
      it('v1.9.0-beta.1', function () {
        expect((0, _install.getBranches)('v1.9.0-beta.1')).toEqual(['v1.9.0-beta.1', 'develop', 'master']);
      });
    });
  });
});