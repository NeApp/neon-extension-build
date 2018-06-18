"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.InstallModules = void 0;

var _filter = _interopRequireDefault(require("lodash/filter"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _map = _interopRequireDefault(require("lodash/map"));

var _values = _interopRequireDefault(require("lodash/values"));

var _npm = _interopRequireDefault(require("../../core/npm"));

var _vorpal = _interopRequireDefault(require("../../core/vorpal"));

var _helpers = require("../../core/helpers");

var _promise = require("../../core/helpers/promise");

var _package = require("../../core/package");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var InstallModules = _helpers.Task.create({
  name: 'module:install',
  description: 'Install modules.'
}, function (log, browser, environment) {
  if (environment.name !== 'development') {
    return Promise.reject(new Error('Only development environments are supported'));
  } // Install modules


  var count = 0;
  return (0, _promise.runSequential)((0, _values.default)(browser.modules), function (module) {
    if (module.type === 'package') {
      return Promise.resolve();
    }

    count++; // Pack module

    return _npm.default.pack(browser.extension.path, module.path).then(function (_ref) {
      var stdout = _ref.stdout,
          stderr = _ref.stderr;
      var lines = stdout.split('\n');
      var file = lines[lines.length - 1];

      if (file.indexOf('neon-extension-') !== 0) {
        log.error("[".concat(module.name, "] Invalid file: ").concat(file));
        return Promise.reject();
      }

      log.info("[".concat(module.name, "] ").concat(file));

      if (stderr.length > 0) {
        log.warn("[".concat(module.name, "] ").concat(stderr));
      }

      return file;
    });
  }).then(function (files) {
    files = (0, _filter.default)(files, function (file) {
      return !(0, _isNil.default)(file);
    }); // Ensure all modules have been packed

    if (files.length < count) {
      log.error("Unable to pack ".concat(count - files.length, " module(s)"));
      return Promise.reject();
    }

    log.info('Installing package...'); // Install package

    return _npm.default.install(browser.extension.path).then(_npm.default.createHandler(_vorpal.default.logger));
  }).then(function () {
    // De-duplicate modules
    return _npm.default.dedupe(browser.extension.path).then(_npm.default.createHandler(_vorpal.default.logger));
  }).then(function () {
    log.info('Cleaning package...'); // Clean "package-lock.json" (remove "integrity" field from modules)

    return (0, _package.writePackageLocks)(browser.extension.path);
  });
});

exports.InstallModules = InstallModules;
var _default = InstallModules;
exports.default = _default;