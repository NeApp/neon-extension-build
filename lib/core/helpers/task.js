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

var _isString = _interopRequireDefault(require("lodash/isString"));

var _padEnd = _interopRequireDefault(require("lodash/padEnd"));

var _path = _interopRequireDefault(require("path"));

var _process = _interopRequireDefault(require("process"));

var _timeDiff = _interopRequireDefault(require("time-diff"));

var _browser = _interopRequireDefault(require("../browser"));

var _environment = _interopRequireDefault(require("../environment"));

var _vorpal = _interopRequireDefault(require("../vorpal"));

var _constants = require("../constants");

var _promise = require("../../core/helpers/promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Logger = _vorpal["default"].logger;
var Tasks = {};
var Timer = new _timeDiff["default"]();

function getBrowserColour(_ref) {
  var dirty = _ref.dirty,
      extension = _ref.extension;

  if (dirty) {
    return _chalk["default"].red;
  }

  if (extension.repository.ahead > 0) {
    return _chalk["default"].yellow;
  }

  return _chalk["default"].green;
}

function getModuleColour(_ref2) {
  var repository = _ref2.repository;

  if (repository.dirty) {
    return _chalk["default"].red;
  }

  if (repository.ahead > 0) {
    return _chalk["default"].yellow;
  }

  return _chalk["default"].green;
}

function createLogger(prefix, name) {
  function log(target, message) {
    target("".concat(prefix, "(").concat(_chalk["default"].cyan((0, _padEnd["default"])(name, 14)), ") ").concat(message));
  }

  return {
    debug: log.bind(null, Logger.debug),
    info: log.bind(null, Logger.info),
    warn: log.bind(null, Logger.warn),
    error: log.bind(null, Logger.error),
    fatal: log.bind(null, Logger.fatal)
  };
}

function getEnvironmentName(environment) {
  if (environment.name === 'production') {
    return _chalk["default"].green(environment.title);
  }

  return _chalk["default"].yellow(environment.title);
}

function createLoggerPrefix(browser, environment) {
  return "[".concat(getEnvironmentName(environment), "#").concat(_chalk["default"].cyan((0, _padEnd["default"])(browser.title, 7)), "] ");
}

function createTask(_ref3) {
  var name = _ref3.name,
      _ref3$required = _ref3.required,
      required = _ref3$required === void 0 ? [] : _ref3$required,
      _ref3$optional = _ref3.optional,
      optional = _ref3$optional === void 0 ? [] : _ref3$optional;
  var handler = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  return function (browser, environment, options) {
    options = _objectSpread({
      required: true
    }, options);
    var prefix = createLoggerPrefix(browser, environment);
    return Promise.resolve() // Resolve required dependencies
    .then(function () {
      return Promise.all(required.map(function (name) {
        if (!(0, _isString["default"])(name)) {
          return Promise.reject("Invalid dependency: ".concat(name, " (expected string)"));
        }

        if ((0, _isNil["default"])(Tasks[name])) {
          return Promise.reject("Unknown dependency: ".concat(name));
        }

        return Tasks[name](browser, environment)["catch"](function () {
          return Promise.reject(new Error('Unable to build required dependency'));
        });
      }));
    }) // Resolve optional dependencies
    .then(function () {
      return Promise.all(optional.map(function (name) {
        if (!(0, _isString["default"])(name)) {
          return Promise.reject("Invalid dependency: ".concat(name, " (expected string)"));
        }

        if ((0, _isNil["default"])(Tasks[name])) {
          return Promise.reject("Unknown dependency: ".concat(name));
        }

        return Tasks[name](browser, environment, {
          required: false
        })["catch"](function () {
          return false;
        });
      }));
    }) // Start task
    .then(function () {
      var promise = environment.tasks[name]; // Nil handler

      if ((0, _isNil["default"])(handler)) {
        return Promise.resolve();
      } // Ensure task has been started


      if ((0, _isNil["default"])(promise)) {
        Logger.info("".concat(prefix, "Starting '").concat(_chalk["default"].cyan(name), "'...")); // Start timer

        Timer.start(name); // Create task promise

        promise = environment.tasks[name] = Promise.resolve().then(function () {
          return handler(createLogger(prefix, name), browser, environment, options);
        }); // Display task result

        promise = promise.then(function () {
          Logger.info("".concat(prefix, "Finished '").concat(_chalk["default"].cyan(name), "' after ").concat(_chalk["default"].magenta(Timer.end(name))));
        }, function (err) {
          if (options.required) {
            Logger.error("".concat(prefix, "Errored '").concat(_chalk["default"].cyan(name), "' after ").concat(_chalk["default"].magenta(Timer.end(name)), ": ").concat(err && err.stack ? err.stack : err));
          } else {
            Logger.info("".concat(prefix, "Skipped '").concat(_chalk["default"].cyan(name), "' after ").concat(_chalk["default"].magenta(Timer.end(name)), ": ").concat(err && err.stack ? err.stack : err));
          }

          return Promise.reject(err);
        });
      } // Return promise


      return promise;
    }, function (err) {
      Logger.error("".concat(prefix, "Errored '").concat(_chalk["default"].cyan(name), "': ").concat(err && err.stack ? err.stack : err));
      return Promise.reject(err);
    });
  };
}

function createRunner(task, defaultOptions) {
  return function (_ref4) {
    var options = _ref4.options,
        args = _objectWithoutProperties(_ref4, ["options"]);

    // Set default options
    options = _objectSpread({
      'browser': 'all',
      'environment': 'development',
      'debug': false
    }, defaultOptions || {}, {}, args, {}, options, {
      // Resolve directories
      'build-dir': _path["default"].resolve(process.cwd(), options['build-dir'] || './Build'),
      'package-dir': _path["default"].resolve(process.cwd(), options['package-dir'] || './')
    }); // Configure logger

    if (options['debug']) {
      _vorpal["default"].logger.setFilter('debug');
    } // Run task for each browser


    return (0, _promise.runSequential)(_browser["default"].getBrowsers(options.browser), function (name) {
      return (// Resolve browser
        _browser["default"].resolve(options['package-dir'], name)["catch"](function (err) {
          Logger.error("Unable to resolve browser(s): ".concat(err && err.stack ? err.stack : err));
          return Promise.reject(err);
        }).then(function (browser) {
          // Try create new build environment
          var environment;

          try {
            environment = _environment["default"].resolve(options.environment, browser, options);
          } catch (err) {
            Logger.error("Unable to resolve \"".concat(options.environment, "\" environment: ").concat(err && err.stack ? err.stack : err));
            return Promise.resolve();
          } // Create logger prefix


          var prefix = createLoggerPrefix(browser, environment); // Display loaded modules

          (0, _forEach["default"])(browser.modules, function (module) {
            Logger.info(prefix + getModuleColour(module)("Loaded: ".concat(module.name, " (").concat(module.version, ")")));
          }); // Display extension version

          Logger.info(prefix + getBrowserColour(browser)("Version: ".concat(browser.version))); // Display extension version name

          Logger.info(prefix + getBrowserColour(browser)("Version Name: ".concat(browser.versionName))); // Don't build dirty production environments

          if (environment.name === 'production' && browser.extension.dirty) {
            return Promise.reject(new Error('Environment is dirty'));
          } // Run task


          return task(browser, environment, options);
        })
      );
    })["catch"](function (err) {
      Logger.error("Build failed: ".concat(err && err.stack ? err.stack : err));

      _process["default"].exit(1);
    });
  };
}

function create(_ref5) {
  var name = _ref5.name,
      description = _ref5.description,
      required = _ref5.required,
      optional = _ref5.optional,
      command = _ref5.command;
  var handler = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var defaultOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var key = name.substring(0, name.indexOf(' ')) || name; // Create task

  var task = createTask({
    name: key,
    required: required,
    optional: optional
  }, handler); // Set defaults

  if ((0, _isNil["default"])(command)) {
    command = function command(cmd) {
      return cmd;
    };
  } // Create command


  command(_vorpal["default"].command(name, description)).option('--build-dir <build-dir>', 'Build Directory [default: ./Build]').option('--package-dir <package-dir>', 'Package Directory [default: ./]').option('--browser <browser>', 'Browser [default: all]', Object.keys(_constants.Browsers)).option('--environment <environment>', 'Environment [default: development]', Object.keys(_constants.Environments)).option('--debug', 'Enable debug messages').action(createRunner(task, defaultOptions)); // Store task reference

  Tasks[key] = task;
  return task;
}