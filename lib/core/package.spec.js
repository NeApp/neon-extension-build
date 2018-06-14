"use strict";

var _package = require("./package");

describe('Package', function () {
  describe('updatePackage', function () {
    it('should update dependencies', function () {
      expect((0, _package.updatePackage)({
        name: 'neon-extension-chrome',
        dependencies: {
          'neon-extension-core': '1.9.0',
          'neon-extension-framework': '1.9.0',
          'neon-extension-destination-lastfm': '1.9.0',
          'neon-extension-destination-librefm': '1.9.0'
        }
      }, {
        'neon-extension-framework': '2.0.0',
        'neon-extension-destination-lastfm': '2.0.0'
      })).toEqual({
        name: 'neon-extension-chrome',
        dependencies: {
          'neon-extension-core': '1.9.0',
          'neon-extension-framework': '2.0.0',
          'neon-extension-destination-lastfm': '2.0.0',
          'neon-extension-destination-librefm': '1.9.0'
        }
      });
    });
    it('should update peer dependencies', function () {
      expect((0, _package.updatePackage)({
        name: 'neon-extension-chrome',
        dependencies: {
          'lodash': '^4.17.5'
        },
        peerDependencies: {
          'neon-extension-core': '1.9.0',
          'neon-extension-framework': '1.9.0',
          'neon-extension-destination-lastfm': '1.9.0',
          'neon-extension-destination-librefm': '1.9.0'
        }
      }, {
        'neon-extension-framework': '2.0.0',
        'neon-extension-destination-lastfm': '2.0.0'
      })).toEqual({
        name: 'neon-extension-chrome',
        dependencies: {
          'lodash': '^4.17.5'
        },
        peerDependencies: {
          'neon-extension-core': '1.9.0',
          'neon-extension-framework': '2.0.0',
          'neon-extension-destination-lastfm': '2.0.0',
          'neon-extension-destination-librefm': '1.9.0'
        }
      });
    });
  });
  describe('updatePackageLocks', function () {
    it('should remove "integrity" fields', function () {
      expect((0, _package.updatePackageLocks)({
        name: 'neon-extension-chrome',
        dependencies: {
          'neon-extension-core': {
            version: '1.9.0',
            integrity: 'test'
          },
          'neon-extension-framework': {
            version: '1.9.0'
          },
          'neon-extension-destination-lastfm': {
            version: '1.9.0'
          },
          'neon-extension-destination-librefm': {
            version: '1.9.0'
          }
        }
      })).toEqual({
        name: 'neon-extension-chrome',
        dependencies: {
          'neon-extension-core': {
            version: '1.9.0'
          },
          'neon-extension-framework': {
            version: '1.9.0'
          },
          'neon-extension-destination-lastfm': {
            version: '1.9.0'
          },
          'neon-extension-destination-librefm': {
            version: '1.9.0'
          }
        }
      });
    });
    it('should update dependencies', function () {
      expect((0, _package.updatePackageLocks)({
        name: 'neon-extension-chrome',
        dependencies: {
          'neon-extension-core': {
            version: '1.9.0'
          },
          'neon-extension-framework': {
            version: '1.9.0'
          },
          'neon-extension-destination-lastfm': {
            version: '1.9.0'
          },
          'neon-extension-destination-librefm': {
            version: '1.9.0'
          }
        }
      }, {
        'neon-extension-framework': '2.0.0',
        'neon-extension-destination-lastfm': '2.0.0'
      })).toEqual({
        name: 'neon-extension-chrome',
        dependencies: {
          'neon-extension-core': {
            version: '1.9.0'
          },
          'neon-extension-framework': {
            version: '2.0.0'
          },
          'neon-extension-destination-lastfm': {
            version: '2.0.0'
          },
          'neon-extension-destination-librefm': {
            version: '1.9.0'
          }
        }
      });
    });
  });
});