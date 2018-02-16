"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Bintray = void 0;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _path = _interopRequireDefault(require("path"));

var _clean = _interopRequireDefault(require("../clean"));

var _helpers = require("../../core/helpers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createDescriptor(browser) {
  if (browser.dirty) {
    return Promise.reject(new Error('Unable to create bintray descriptor, environment is dirty'));
  }

  return Promise.resolve({
    'package': {
      'name': browser.extension.package.name,
      'licenses': ['GPL-3.0'],
      'subject': 'neapp',
      'repo': 'neon-extension',
      'vcs_url': "https://github.com/NeApp/".concat(browser.extension.package.name, ".git")
    },
    'version': {
      'name': browser.versionName,
      'vcs_tag': browser.extension.tag,
      'attributes': [{
        'name': 'branch',
        'type': 'string',
        'values': [browser.extension.branch]
      }, {
        'name': 'commit',
        'type': 'string',
        'values': [browser.extension.commit]
      }, {
        'name': 'version',
        'type': 'string',
        'values': [browser.version]
      }, {
        'name': 'build_number',
        'type': 'number',
        'values': [parseInt(browser.extension.travis.number, 10)]
      }]
    },
    'files': [{
      'includePattern': 'build/production/(.*\\.zip)',
      'uploadPattern': '$1',
      'matrixParams': {
        'override': 1
      }
    }, {
      'includePattern': 'build/production/(MD5SUMS|webpack.*)',
      'uploadPattern': "Neon-".concat(browser.title, "-").concat(browser.versionName, "/$1"),
      'matrixParams': {
        'override': 1
      }
    }],
    'publish': true
  });
}

var Bintray = _helpers.Task.create({
  name: 'deploy:bintray',
  description: 'Create bintray descriptor for the built extension.',
  required: [_clean.default]
}, function (log, browser, environment) {
  // Write bintray descriptor to file
  return createDescriptor(browser).then(function (descriptor) {
    return _fsExtra.default.writeJson(_path.default.join(environment.buildPath, 'bintray.json'), descriptor, {
      spaces: 2
    });
  });
});

exports.Bintray = Bintray;
var _default = Bintray;
exports.default = _default;