"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateDependency = validateDependency;
exports.validateDependencies = validateDependencies;
exports.validateDevelopmentDependencies = validateDevelopmentDependencies;
exports.validateModules = validateModules;
exports.default = exports.ValidateModules = void 0;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _isEqual = _interopRequireDefault(require("lodash/isEqual"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _keys = _interopRequireDefault(require("lodash/keys"));

var _path = _interopRequireDefault(require("path"));

var _pickBy = _interopRequireDefault(require("lodash/pickBy"));

var _semver = _interopRequireDefault(require("semver"));

var _values = _interopRequireDefault(require("lodash/values"));

var _helpers = require("../../core/helpers");

var _package = require("../../core/package");

var _promise = require("../../core/helpers/promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function validateDependency(log, packageModuleNode, module, moduleNode, name, version) {
  var dev = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : false;
  log.debug("[".concat(module.name, "/").concat(name, "] ").concat(version)); // Resolve module dependency

  var moduleDependency = moduleNode.resolve(name);

  if ((0, _isNil.default)(moduleDependency)) {
    log.error("[".concat(module.name, "/").concat(name, "] Unable to find dependency in module"));
    return false;
  } // Resolve package dependency


  var packageDependency = packageModuleNode.resolve(name);

  if ((0, _isNil.default)(packageDependency)) {
    if (dev) {
      return true;
    }

    log.error("[".concat(module.name, "/").concat(name, "] Unable to find dependency in package"));
    return false;
  } // Ensure versions match


  if (moduleDependency.version !== packageDependency.version) {
    log.error("[".concat(module.name, "/").concat(name, "] ").concat(moduleDependency.version, " doesn't match package ").concat(packageDependency.version));
    return false;
  } // Ensure dependency matches specification


  if (!_semver.default.satisfies(moduleDependency.version, version)) {
    log.error("[".concat(module.name, "/").concat(name, "] ").concat(moduleDependency.version, " doesn't satisfy ").concat(version));
    return false;
  } // Dependency valid


  return true;
}

function validateDependencies(log, browser, packageModuleNode, module, moduleNode) {
  var valid = true; // Validate dependencies

  (0, _forEach.default)(module.package.dependencies, function (version, name) {
    if (!validateDependency(log, packageModuleNode, module, moduleNode, name, version)) {
      valid = false;
    }
  }); // Validate development dependencies

  (0, _forEach.default)(module.package.devDependencies, function (version, name) {
    if (!validateDependency(log, packageModuleNode, module, moduleNode, name, version, true)) {
      valid = false;
    }
  });
  return valid;
}

function validateDevelopmentDependencies(log, browser, build, module) {
  var valid = true; // Ensure development dependencies match radon-extension-build

  var incorrect = (0, _pickBy.default)(module.package['devDependencies'], function (current, name) {
    var common = build.package['dependencies'][name];

    if ((0, _isNil.default)(common) || common === current) {
      return false;
    }

    if (_semver.default.valid(common)) {
      return !_semver.default.satisfies(common, current);
    }

    return true;
  });

  if ((0, _keys.default)(incorrect).length > 0) {
    (0, _forEach.default)((0, _keys.default)(incorrect).sort(), function (name) {
      var common = build.package['dependencies'][name];

      if (_semver.default.valid(common)) {
        log.error("[".concat(module.name, "/").concat(name, "] ").concat(incorrect[name], " doesn't satisfy package ").concat(common));
      } else {
        log.error("[".concat(module.name, "/").concat(name, "] ").concat(incorrect[name], " doesn't match package ").concat(common));
      }
    });
    valid = false;
  }

  return valid;
}

function validateModules(log, browser, environment, packageNode) {
  var valid = true; // Retrieve build module

  var build = browser.modules['build']; // Validate modules

  return (0, _promise.runSequential)((0, _values.default)(browser.modules), function (module) {
    if (module.type === 'package') {
      return Promise.resolve();
    }

    var path = module.path; // Use module source in production environments (if available)

    if (environment.name === 'production') {
      var modulePath = _path.default.join(browser.extension.path, '.modules', module.name);

      if (!_fsExtra.default.existsSync(modulePath)) {
        log.info("[".concat(module.name, "] Skipped (module source not available)"));
        return Promise.resolve();
      }

      path = modulePath;
    } // Retrieve package dependency


    var packageModuleNode = packageNode.get(module.name);

    if ((0, _isNil.default)(packageModuleNode)) {
      return Promise.reject(new Error('Unable to find module in package tree'));
    } // Ensure "package-lock.json" exists


    if (!_fsExtra.default.existsSync(_path.default.join(path, 'package-lock.json'))) {
      log.info("[".concat(module.name, "] Skipped (no \"package-lock.json\" file exists)"));
      return Promise.resolve();
    } // Retrieve module dependency tree


    return (0, _package.getDependencyTree)(path).catch(function () {
      return null;
    }).then(function (moduleNode) {
      if ((0, _isNil.default)(moduleNode)) {
        log.error("[".concat(module.name, "] Unable to parse \"package-lock.json\" file"));
        valid = false;
        return;
      } // Ensure cached requirements are up to date


      if (!(0, _isEqual.default)(packageModuleNode.requires, module.package.dependencies)) {
        log.warn("[".concat(module.name, "] Cached requirements are out of date"));
        valid = false;
      } // Validate module dependencies


      if (!validateDependencies(log, browser, packageModuleNode, module, moduleNode)) {
        valid = false;
      } // Validate development dependencies


      if (!validateDevelopmentDependencies(log, browser, build, module)) {
        valid = false;
      }
    }).catch(function (err) {
      log.error("[".concat(module.name, "] ").concat(err && err.stack ? err.stack : err));
      valid = false;
    });
  }).then(function () {
    if (!valid) {
      return Promise.reject(new Error('Validation failed'));
    }

    return Promise.resolve();
  });
}

var ValidateModules = _helpers.Task.create({
  name: 'module:validate',
  description: 'Validate modules.'
}, function (log, browser, environment) {
  // Retrieve package dependency tree
  return (0, _package.getDependencyTree)(browser.path).then(function (packageNode) {
    return (// Validate modules
      validateModules(log, browser, environment, packageNode)
    );
  });
});

exports.ValidateModules = ValidateModules;
var _default = ValidateModules;
exports.default = _default;