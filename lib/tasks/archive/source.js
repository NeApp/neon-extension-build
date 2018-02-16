"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.SourceArchiveTask = void 0;

var _path = _interopRequireDefault(require("path"));

var _clean = _interopRequireDefault(require("../clean"));

var _copy = _interopRequireDefault(require("../../core/copy"));

var _json = _interopRequireDefault(require("../../core/json"));

var _helpers = require("../../core/helpers");

var _zip = require("../../core/zip");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

var Pattern = '{assets/**/*,*.json,*.md,.*}';

function setPackageVersion(browser, environment) {
  var path = _path.default.join(environment.output.source, 'package.json'); // Read package details from `path`


  return _json.default.read(path).then(function (pkg) {
    return (// Update package version, and write back to `path`
      _json.default.write(path, _extends({}, pkg, {
        version: browser.version
      }), {
        spaces: 2
      })
    );
  });
}

var SourceArchiveTask = _helpers.Task.create({
  name: 'archive:source',
  description: 'Create source archive of the browser package.',
  required: [_clean.default]
}, function (log, browser, environment) {
  // Copy browser sources to the build directory
  return (0, _copy.default)(Pattern, browser.path, environment.output.source) // Set browser version
  .then(function () {
    return setPackageVersion(browser, environment);
  }) // Create an archive of browser sources
  .then(function () {
    return (0, _zip.createZip)({
      archive: _path.default.join(environment.buildPath, "Neon-".concat(browser.title, "-").concat(browser.versionName, "-sources.zip")),
      source: environment.output.source,
      pattern: '{assets/**/*,*.json,*.md,.*}'
    });
  });
});

exports.SourceArchiveTask = SourceArchiveTask;
var _default = SourceArchiveTask;
exports.default = _default;