"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Build = void 0;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _path = _interopRequireDefault(require("path"));

var _assets = _interopRequireDefault(require("./assets"));

var _credits = _interopRequireDefault(require("./credits"));

var _extension = _interopRequireDefault(require("./extension"));

var _manifest = _interopRequireDefault(require("./manifest"));

var _bintray = _interopRequireDefault(require("../deploy/bintray"));

var _checksum = _interopRequireDefault(require("../../core/checksum"));

var _release = _interopRequireDefault(require("../archive/release"));

var _source = _interopRequireDefault(require("../archive/source"));

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
  required: [_assets.default, _credits.default, _extension.default, _manifest.default, _release.default, _source.default],
  optional: [_bintray.default]
}, function (log, browser, environment) {
  // Write checksums
  return _checksum.default.writeMany(environment.buildPath, '{unpacked/**/*,*.zip}') // Write state
  .then(function () {
    return writeState(browser, environment);
  });
}); // Import children


exports.Build = Build;

_fsExtra.default.readdirSync(__dirname).forEach(function (name) {
  try {
    require("./".concat(name));
  } catch (e) {
    console.warn("Unable to import \"./".concat(name, "\": ").concat(e));
  }
});

var _default = Build;
exports.default = _default;