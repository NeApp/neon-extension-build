"use strict";

var _install = require("./install");

describe('Commands', function () {
  describe('install:travis', function () {
    describe('getBranches', function () {
      it('master', function () {
        expect((0, _install.getBranches)('master')).toEqual(['master']);
      });
      it('develop', function () {
        expect((0, _install.getBranches)('develop')).toEqual(['develop']);
      });
      it('feature/test', function () {
        expect((0, _install.getBranches)('feature/test')).toEqual(['feature/test', 'develop']);
      });
      it('v1.9.0', function () {
        expect((0, _install.getBranches)('v1.9.0')).toEqual(['v1.9.0', 'v1.9']);
      });
      it('v1.9.0-beta.1', function () {
        expect((0, _install.getBranches)('v1.9.0-beta.1')).toEqual(['v1.9.0-beta.1', 'v1.9']);
      });
      it('v1.9', function () {
        expect((0, _install.getBranches)('v1.9')).toEqual(['v1.9', 'develop']);
      });
    });
  });
});