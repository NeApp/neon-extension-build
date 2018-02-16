"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.ReleaseArchiveTask = void 0;

var _path = _interopRequireDefault(require("path"));

var _assets = _interopRequireDefault(require("../build/assets"));

var _extension = _interopRequireDefault(require("../build/extension"));

var _manifest = _interopRequireDefault(require("../build/manifest"));

var _helpers = require("../../core/helpers");

var _zip = require("../../core/zip");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ReleaseArchiveTask = _helpers.Task.create({
  name: 'archive:release',
  description: 'Create release archive of the built extension.',
  required: [_assets.default, _extension.default, _manifest.default]
}, function (log, browser, environment) {
  return (0, _zip.createZip)({
    archive: _path.default.join(environment.buildPath, "Neon-".concat(browser.title, "-").concat(browser.versionName, ".zip")),
    source: environment.outputPath,
    pattern: '**/*'
  });
});

exports.ReleaseArchiveTask = ReleaseArchiveTask;
var _default = ReleaseArchiveTask;
exports.default = _default;