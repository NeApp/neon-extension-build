"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Build = void 0;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _path = _interopRequireDefault(require("path"));

var _import = _interopRequireDefault(require("../../core/helpers/import"));

var _checksum = _interopRequireDefault(require("../../core/checksum"));

var _helpers = require("../../core/helpers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function writeState(browser, environment) {
  return Promise.resolve().then(function () {
    return _fsExtra.default.writeJson(_path.default.join(environment.buildPath, 'browser.json'), browser, {
      spaces: 2
    });
  }).then(function () {
    return _fsExtra.default.writeJson(_path.default.join(environment.buildPath, 'environment.json'), environment, {
      spaces: 2
    });
  });
}

var Build = _helpers.Task.create({
  name: 'build',
  description: 'Build extension.',
  required: ['build:assets', 'build:credits', 'build:extension', 'build:manifest', 'archive:release', 'archive:source'],
  optional: ['deploy:bintray']
}, function (log, browser, environment) {
  // Write checksums
  return _checksum.default.writeMany(environment.buildPath, '{unpacked/**/*,*.zip}') // Write state
  .then(function () {
    return writeState(browser, environment);
  });
}); // Import children


exports.Build = Build;
(0, _import.default)(__dirname);
var _default = Build;
exports.default = _default;