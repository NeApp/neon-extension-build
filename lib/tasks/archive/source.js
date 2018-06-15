"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.SourceArchiveTask = void 0;

var _mapValues = _interopRequireDefault(require("lodash/mapValues"));

var _path = _interopRequireDefault(require("path"));

var _pick = _interopRequireDefault(require("lodash/pick"));

var _copy = _interopRequireDefault(require("../../core/copy"));

var _json = _interopRequireDefault(require("../../core/json"));

var _helpers = require("../../core/helpers");

var _zip = require("../../core/zip");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Pattern = '{Assets/**/*,*.json,*.md,.*}';

function writeBuildDetails(browser, environment) {
  var path = _path.default.join(environment.output.source, 'build.json'); // Write build details


  _json.default.write(path, (0, _mapValues.default)(browser.modules, function (module) {
    if (module.type === 'package') {
      return (0, _pick.default)(module, ['repository', 'travis']);
    }

    return (0, _pick.default)(module, ['repository']);
  }), {
    spaces: 2
  });
}

var SourceArchiveTask = _helpers.Task.create({
  name: 'archive:source',
  description: 'Create source archive of the browser package.',
  required: ['clean']
}, function (log, browser, environment) {
  // Copy browser sources to the build directory
  return (0, _copy.default)(Pattern, browser.path, environment.output.source) // Write build details
  .then(function () {
    return writeBuildDetails(browser, environment);
  }) // Create an archive of browser sources
  .then(function () {
    return (0, _zip.createZip)({
      archive: _path.default.join(environment.buildPath, "Neon-".concat(browser.title, "-").concat(browser.versionName, "-sources.zip")),
      source: environment.output.source,
      pattern: '{Assets/**/*,*.json,*.md,.*}'
    });
  });
});

exports.SourceArchiveTask = SourceArchiveTask;
var _default = SourceArchiveTask;
exports.default = _default;