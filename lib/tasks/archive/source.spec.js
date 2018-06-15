"use strict";

var _source = require("./source");

describe('Tasks', function () {
  describe('archive:source', function () {
    describe('getModuleVersions', function () {
      it('should return versions for tagged commits', function () {
        expect((0, _source.getModuleVersions)({
          modules: {
            'neon-extension-framework': {
              repository: {
                tag: 'v1.9.0'
              }
            }
          }
        })).toEqual({
          'neon-extension-framework': '1.9.0'
        });
      });
      it('should return GitHub URLs for untagged commits', function () {
        expect((0, _source.getModuleVersions)({
          modules: {
            'neon-extension-framework': {
              name: 'neon-extension-framework',
              repository: {
                commit: 'abc123',
                tag: null
              }
            }
          }
        })).toEqual({
          'neon-extension-framework': 'NeApp/neon-extension-framework#abc123'
        });
      });
    });
  });
});