"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createTask = createTask;
exports.createRunner = createRunner;
exports.create = create;

var _chalk = _interopRequireDefault(require("chalk"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _padEnd = _interopRequireDefault(require("lodash/padEnd"));

var _path = _interopRequireDefault(require("path"));

var _process = _interopRequireDefault(require("process"));

var _timeDiff = _interopRequireDefault(require("time-diff"));

var _browser = _interopRequireDefault(require("../browser"));

var _environment = _interopRequireDefault(require("../environment"));

var _vorpal = _interopRequireDefault(require("../vorpal"));

var _constants = require("../constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

var Logger = _vorpal.default.logger;
var Timer = new _timeDiff.default();

function getRepositoryColor(repository) {
  if (repository.dirty) {
    return _chalk.default.red;
  }

  if (repository.ahead > 0) {
    return _chalk.default.yellow;
  }

  return _chalk.default.green;
}

function createLogger(prefix, name) {
  function log(target, message) {
    target("".concat(prefix, "(").concat(_chalk.default.cyan(name), ") ").concat(message));
  }

  return {
    debug: log.bind(null, Logger.debug),
    info: log.bind(null, Logger.info),
    warn: log.bind(null, Logger.warn),
    error: log.bind(null, Logger.error),
    fatal: log.bind(null, Logger.fatal)
  };
}

function getEnvironmentName(name) {
  if (name === 'production') {
    return _chalk.default.green(name);
  }

  return _chalk.default.yellow(name);
}

function createLoggerPrefix(browser, environment) {
  return "[".concat(getEnvironmentName(environment.name), "#").concat(_chalk.default.cyan((0, _padEnd.default)(browser.name, 7)), "] ");
}

function createTask(_ref) {
  var name = _ref.name,
      _ref$required = _ref.required,
      required = _ref$required === void 0 ? [] : _ref$required,
      _ref$optional = _ref.optional,
      optional = _ref$optional === void 0 ? [] : _ref$optional;
  var handler = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  return function (browser, environment, options) {
    options = _extends({
      required: true
    }, options);
    var prefix = createLoggerPrefix(browser, environment);
    return Promise.resolve() // Resolve required dependencies
    .then(function () {
      return Promise.all(required.map(function (dep) {
        return dep(browser, environment).catch(function () {
          return Promise.reject(new Error('Unable to build required dependency'));
        });
      }));
    }) // Resolve optional dependencies
    .then(function () {
      return Promise.all(optional.map(function (dep) {
        return dep(browser, environment, {
          required: false
        }).catch(function () {
          return false;
        });
      }));
    }) // Start task
    .then(function () {
      var promise = environment.tasks[name]; // Nil handler

      if ((0, _isNil.default)(handler)) {
        return Promise.resolve();
      } // Ensure task has been started


      if ((0, _isNil.default)(promise)) {
        Logger.info("".concat(prefix, "Starting '").concat(_chalk.default.cyan(name), "'...")); // Start timer

        Timer.start(name); // Create task promise

        promise = environment.tasks[name] = Promise.resolve().then(function () {
          return handler(createLogger(prefix, name), browser, environment);
        }); // Display task result

        promise = promise.then(function () {
          Logger.info("".concat(prefix, "Finished '").concat(_chalk.default.cyan(name), "' after ").concat(_chalk.default.magenta(Timer.end(name))));
        }, function (err) {
          if (options.required) {
            Logger.error("".concat(prefix, "Errored '").concat(_chalk.default.cyan(name), "' after ").concat(_chalk.default.magenta(Timer.end(name)), ": ").concat(err.stack || err.message || err));
          } else {
            Logger.info("".concat(prefix, "Skipped '").concat(_chalk.default.cyan(name), "' after ").concat(_chalk.default.magenta(Timer.end(name)), ": ").concat(err.stack || err.message || err));
          }

          return Promise.reject(err);
        });
      } // Return promise


      return promise;
    }, function (err) {
      Logger.error("".concat(prefix, "Errored '").concat(_chalk.default.cyan(name), "': ").concat(err.stack || err.message || err));
      return Promise.reject(err);
    });
  };
}

function createRunner(task, defaultOptions) {
  return function (_ref2) {
    var options = _ref2.options;
    // Set default options
    options = _extends({
      'browser': 'all',
      'environment': 'development'
    }, defaultOptions || {}, options, {
      // Resolve directories
      'build-dir': _path.default.resolve(process.cwd(), options['build-dir'] || './build'),
      'package-dir': _path.default.resolve(process.cwd(), options['package-dir'] || './')
    }); // Run task for each browser

    return _browser.default.resolve(options['package-dir'], options.browser).then(function (browsers) {
      return Promise.all(browsers.map(function (browser) {
        // Try create new build environment
        var environment;

        try {
          environment = _environment.default.resolve(options.environment, browser, options);
        } catch (e) {
          Logger.error("Unable to resolve \"".concat(options.environment, "\" environment: ").concat(e && e.message ? e.message : e));
          return Promise.resolve();
        } // Create logger prefix


        var prefix = createLoggerPrefix(browser, environment); // Display loaded modules

        (0, _forEach.default)(browser.modules, function (module) {
          Logger.info(prefix + getRepositoryColor(module.repository)("Loaded: ".concat(module.name, " (").concat(module.version, ")")));
        }); // Display extension version

        Logger.info(prefix + getRepositoryColor(browser.extension.repository)("Version: ".concat(browser.version))); // Display extension version name

        Logger.info(prefix + getRepositoryColor(browser.extension.repository)("Version Name: ".concat(browser.versionName))); // Run task

        return task(browser, environment);
      }));
    }).catch(function () {
      _process.default.exit(1);
    });
  };
}

function create(_ref3) {
  var name = _ref3.name,
      description = _ref3.description,
      required = _ref3.required,
      optional = _ref3.optional;
  var handler = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var defaultOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var task = createTask({
    name: name,
    required: required,
    optional: optional
  }, handler); // Create command

  _vorpal.default.command(name, description).option('--build-dir <build-dir>', 'Build Directory [default: ./build]').option('--package-dir <package-dir>', 'Package Directory [default: ./]').option('--browser <browser>', 'Browser [default: all]', Object.keys(_constants.Browsers)).option('--environment <environment>', 'Environment [default: development]', Object.keys(_constants.Environments)).action(createRunner(task, defaultOptions)); // Return task reference


  return task;
}