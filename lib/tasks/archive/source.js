"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getModuleVersions = getModuleVersions;
exports.default = exports.SourceArchiveTask = void 0;

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _mapKeys = _interopRequireDefault(require("lodash/mapKeys"));

var _mapValues = _interopRequireDefault(require("lodash/mapValues"));

var _path = _interopRequireDefault(require("path"));

var _pick = _interopRequireDefault(require("lodash/pick"));

var _copy = _interopRequireDefault(require("../../core/copy"));

var _json = _interopRequireDefault(require("../../core/json"));

var _helpers = require("../../core/helpers");

var _zip = require("../../core/zip");

var _package = require("../../core/package");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Pattern = '{Assets/**/*,*.json,*.md,.*}';

function getModuleVersions(browser) {
  return (0, _mapValues.default)((0, _mapKeys.default)(browser.modules, function (module) {
    return module.name;
  }), function (module) {
    if (!(0, _isNil.default)(module.repository.tag)) {
      var tag = module.repository.tag; // Ensure tag is valid

      if (tag.indexOf('v') !== 0) {
        throw new Error("Invalid tag \"".concat(tag, "\" for ").concat(module.name));
      } // Return version (without "v" prefix)


      return tag.substring(1);
    } // Ensure commit exists


    if ((0, _isNil.default)(module.repository.commit)) {
      throw new Error("No commit available for ".concat(module.name));
    } // Build repository path


    var repository = module.repository.url;

    if ((0, _isNil.default)(repository)) {
      throw new Error("No repository url defined for ".concat(module.name));
    }

    if (repository.indexOf('https://github.com/') === 0) {
      repository = repository.substring(19);
    } // Commit


    return {
      version: "".concat(repository, "#").concat(module.repository.commit),
      from: "".concat(module.name, "@").concat(repository, "#").concat(module.repository.commit)
    };
  });
}

function writeBuildDetails(browser, environment) {
  var path = _path.default.join(environment.output.source, 'build.json'); // Write build details


  _json.default.write(path, (0, _mapValues.default)((0, _mapKeys.default)(browser.modules, function (module) {
    return module.name;
  }), function (module) {
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
  var versions = getModuleVersions(browser); // Copy browser sources to the build directory

  return (0, _copy.default)(Pattern, browser.path, environment.output.source) // Update package versions
  .then(function () {
    return (0, _package.writePackage)(environment.output.source, versions);
  }) // Update package lock versions
  .then(function () {
    return (0, _package.writePackageLocks)(environment.output.source, versions);
  }) // Write build details
  .then(function () {
    return writeBuildDetails(browser, environment);
  }) // Create an archive of browser sources
  .then(function () {
    return (0, _zip.createZip)({
      archive: _path.default.join(environment.buildPath, "Radon-".concat(browser.title, "-").concat(browser.versionName, "-sources.zip")),
      source: environment.output.source,
      pattern: '{Assets/**/*,*.json,*.md,.*}'
    });
  });
});

exports.SourceArchiveTask = SourceArchiveTask;
var _default = SourceArchiveTask;
exports.default = _default;