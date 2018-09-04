"use strict";

var _source = require("./source");

describe('Tasks', function () {
  describe('archive:source', function () {
    describe('getModuleVersions', function () {
      it('should return versions for tagged commits', function () {
        expect((0, _source.getModuleVersions)({
          modules: {
            'framework': {
              name: '@radon-extension/framework',
              repository: {
                tag: 'v1.9.0'
              }
            }
          }
        })).toEqual({
          '@radon-extension/framework': '1.9.0'
        });
      });
      it('should return GitHub URLs for untagged commits', function () {
        expect((0, _source.getModuleVersions)({
          modules: {
            'framework': {
              name: '@radon-extension/framework',
              repository: {
                url: 'https://github.com/RadonApp/radon-extension-framework',
                commit: 'abc123',
                tag: null
              }
            }
          }
        })).toEqual({
          '@radon-extension/framework': {
            from: '@radon-extension/framework@RadonApp/radon-extension-framework#abc123',
            version: 'RadonApp/radon-extension-framework#abc123'
          }
        });
      });
    });
  });
});