"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.CreateRelease = void 0;

var _chalk = _interopRequireDefault(require("chalk"));

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _mapValues = _interopRequireDefault(require("lodash/mapValues"));

var _omitBy = _interopRequireDefault(require("lodash/omitBy"));

var _path = _interopRequireDefault(require("path"));

var _pickBy = _interopRequireDefault(require("lodash/pickBy"));

var _semver = _interopRequireDefault(require("semver"));

var _values = _interopRequireDefault(require("lodash/values"));

var _helpers = require("../../core/helpers");

var _promise = require("../../core/helpers/promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function getModulesOrdered(browser) {
  return [browser.modules['neon-extension-build'], // Core
  browser.modules['neon-extension-framework'], browser.modules['neon-extension-core']].concat(_toConsumableArray((0, _values.default)((0, _pickBy.default)(browser.modules, function (module) {
    return ['core', 'tool', 'package'].indexOf(module.type) < 0;
  }))), [// Extension
  browser.extension]);
}

function isPatchRelease(current, next) {
  return _semver.default.major(current) === _semver.default.major(next) && _semver.default.minor(current) === _semver.default.minor(next);
}

function updateDependencies(versions, pkg, key) {
  var caret = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

  if ((0, _isNil.default)(pkg[key])) {
    return;
  } // Remove empty dependencies


  if (Object.keys(pkg[key]).length < 1) {
    delete pkg[key];
    return;
  } // Update dependencies


  pkg[key] = (0, _mapValues.default)(pkg[key], function (version, name) {
    if (name.indexOf('neon-extension-') < 0) {
      return version;
    }

    if ((0, _isNil.default)(versions[name])) {
      throw new Error("Unknown dependency: ".concat(name));
    }

    if (caret) {
      return "^".concat(versions[name]);
    }

    return versions[name];
  });
}

function updateModules(log, browser, version) {
  var versions = {};
  return (0, _promise.runSequential)(getModulesOrdered(browser), function (module) {
    var pkg = (0, _cloneDeep.default)(module.package); // Ensure package metadata exists

    if ((0, _isNil.default)(pkg)) {
      return Promise.reject(_chalk.default.red("Unable to create release, ".concat(module.name, " has no package metadata")));
    } // Ensure the repository isn't dirty


    if (module.repository.dirty) {
      return Promise.reject(_chalk.default.red("Unable to create release, ".concat(module.name, " is dirty")));
    } // Only create patch releases on modules with changes


    if (module.repository.ahead > 0 || !isPatchRelease(pkg.version, version)) {
      log.info(_chalk.default.green("[".concat(module.name, "] ").concat(version))); // Update version

      pkg.version = version; // Store module version

      versions[module.name] = version;
    } else {
      log.info("[".concat(module.name, "] ").concat(pkg.version)); // Store module version

      versions[module.name] = pkg.version;
    } // Update dependencies


    updateDependencies(versions, pkg, 'dependencies'); // Update development dependencies

    updateDependencies(versions, pkg, 'devDependencies'); // Update peer dependencies

    updateDependencies(versions, pkg, 'peerDependencies', true); // Read package metadata from file (to determine the current EOL character)

    var path = _path.default.join(module.path, 'package.json');

    return _fsExtra.default.readFile(path).then(function (data) {
      return (// Write package metadata to file
        _fsExtra.default.writeJson(path, (0, _omitBy.default)(pkg, _isNil.default), {
          EOL: data.indexOf('\r\n') >= 0 ? '\r\n' : '\n',
          spaces: 2
        })
      );
    });
  });
}

var CreateRelease = _helpers.Task.create({
  name: 'release:create <version>',
  description: 'Create release.'
}, function (log, browser, environment, _ref) {
  var version = _ref.version;

  // Ensure the provided `version` is valid
  if (!_semver.default.valid(version)) {
    return Promise.reject(new Error("Invalid version: ".concat(version)));
  } // Update modules


  return updateModules(log, browser, version);
}, {
  version: null
});

exports.CreateRelease = CreateRelease;
var _default = CreateRelease;
exports.default = _default;