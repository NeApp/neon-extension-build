"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isIgnoredPackage = isIgnoredPackage;
exports.logError = logError;
exports.logWarning = logWarning;
exports.validateRequirements = validateRequirements;
exports.validateDependencies = validateDependencies;

var _chalk = _interopRequireDefault(require("chalk"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isString = _interopRequireDefault(require("lodash/isString"));

var _path = _interopRequireDefault(require("path"));

var _process = _interopRequireDefault(require("process"));

var _semver = _interopRequireDefault(require("semver"));

var _npm = _interopRequireDefault(require("../../core/npm"));

var _vorpal = _interopRequireDefault(require("../../core/vorpal"));

var _package = require("../../core/package");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Logger = _vorpal.default.logger;
var IgnoredPackages = [/^neon-extension-([\w-]+)$/, /^(neon-extension-build\/)?travis-ci\/underscore.string$/];

function isIgnoredPackage(path) {
  for (var i = 0; i < IgnoredPackages.length; i++) {
    if (IgnoredPackages[i].test(path)) {
      return true;
    }
  }

  return false;
}

function logError(message) {
  var ignored = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  if (!ignored) {
    Logger.error(_chalk.default.red(message));
  } else {
    Logger.info("".concat(message, " (ignored)"));
  }
}

function logWarning(message) {
  var ignored = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  if (!ignored) {
    Logger.warn(_chalk.default.yellow(message));
  } else {
    Logger.info("".concat(message, " (ignored)"));
  }
}

function validateRequirements(dependency) {
  var prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  if ((0, _isNil.default)(dependency)) {
    return true;
  }

  var result = true;
  (0, _forEach.default)(dependency.requires, function (version, name) {
    var path = "".concat(prefix || '').concat(name);
    var ignored = isIgnoredPackage(path);
    var success = true; // Resolve requirement

    var requirement = dependency.resolve(name);

    if ((0, _isNil.default)(requirement)) {
      logWarning("[".concat(path, "] missing"), ignored);
      return;
    } // Ensure dependency matches


    if (!_semver.default.satisfies(requirement.version, version)) {
      logError("[".concat(path, "] found ").concat(requirement.version, ", expected ").concat(version), ignored);
      success = false;
    } // Update result


    if (!success && !ignored) {
      result = false;
    }
  });
  return result;
}

function validateDependencies(packages, tree) {
  var prefix = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  if ((0, _isNil.default)(packages)) {
    return true;
  }

  var result = true;
  (0, _forEach.default)(packages, function (pkg, name) {
    var path = "".concat(prefix || '').concat(name);
    var ignored = isIgnoredPackage(path);
    var success = true;

    if ((0, _isString.default)(pkg)) {
      pkg = {
        version: pkg
      };
    } // Resolve dependency


    var dependency = tree.resolve(name);

    if ((0, _isNil.default)(dependency)) {
      logWarning("[".concat(path, "] extraneous"), ignored);
      return;
    } // Ensure dependency matches


    if (pkg.version !== dependency.version) {
      logError("[".concat(path, "] found ").concat(pkg.version, ", expected ").concat(dependency.version), ignored);
      success = false;
    } // Update result


    if (!success && !ignored) {
      result = false;
    } // Validate dependencies


    if (!validateDependencies(pkg.dependencies, dependency, "".concat(path, "/"))) {
      result = false;
    } // Validate requirements


    if (!validateRequirements(dependency, "".concat(path, "/"))) {
      result = false;
    }
  });
  return result;
} // Command


var cmd = _vorpal.default.command('package:validate', 'Validate package dependencies.').option('--debug', 'Enable debug messages').option('--target <target>', 'Target package [default: ./]'); // Action


cmd.action(function (_ref) {
  var branch = _ref.branch,
      options = _ref.options;

  var path = _path.default.resolve(options.target || _process.default.cwd()); // Configure logger


  if (options['debug']) {
    _vorpal.default.logger.setFilter('debug');
  } // Retrieve package tree


  return (0, _package.getDependencyTree)(path).then(function (tree) {
    return (// Resolve installed packages
      _npm.default.list(path, {
        '--json': true
      }).catch(function (r) {
        return r;
      }).then(function (_ref2) {
        var stdout = _ref2.stdout;
        var pkg = JSON.parse(stdout);

        if ((0, _isNil.default)(pkg.dependencies)) {
          return Promise.reject(new Error('No packages resolved'));
        } // Validate packages


        if (!validateDependencies(pkg.dependencies, tree)) {
          return Promise.reject(new Error('Validation failed'));
        } // Validation successful


        return true;
      })
    );
  }).catch(function (err) {
    _vorpal.default.logger.error(err.stack || err.message || err);

    _process.default.exit(1);
  });
});