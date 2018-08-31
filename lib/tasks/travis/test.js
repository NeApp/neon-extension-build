"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.testModule = testModule;
exports.test = test;

var _chalk = _interopRequireDefault(require("chalk"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _padEnd = _interopRequireDefault(require("lodash/padEnd"));

var _path = _interopRequireDefault(require("path"));

var _process = _interopRequireDefault(require("process"));

var _npm = _interopRequireDefault(require("../../core/npm"));

var _vorpal = _interopRequireDefault(require("../../core/vorpal"));

var _package = require("../../core/package");

var _promise = require("../../core/helpers/promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function testModule(target, prefix) {
  if (!_fsExtra.default.existsSync(target)) {
    return Promise.resolve();
  }

  return _fsExtra.default.readJson(_path.default.join(target, 'package.json')).then(function (_ref) {
    var name = _ref.name,
        scripts = _ref.scripts;

    if ((0, _isNil.default)(name) || name.length < 1) {
      return Promise.reject(new Error('Invalid package details (no "name" field defined)'));
    } // Ensure "test" script exists


    if ((0, _isNil.default)(scripts.test)) {
      _vorpal.default.logger.warn("".concat(prefix, " ").concat(_chalk.default.yellow('No "test" script exists')));

      return Promise.resolve();
    }

    _vorpal.default.logger.info("".concat(prefix, " ").concat(_chalk.default.cyan('Testing...'))); // Run tests


    return _npm.default.spawn(target, ['run', 'test'], {
      logger: _vorpal.default.logger,
      prefix: prefix
    });
  });
}

function test(target) {
  // Read package details
  return _fsExtra.default.readJson(_path.default.join(target, 'package.json')).then(function (pkg) {
    var modules = (0, _package.getPackageModules)(pkg);

    _vorpal.default.logger.debug("Testing ".concat(modules.length, " module(s) in \"").concat(_path.default.relative(_process.default.cwd(), target) || ".".concat(_path.default.sep), "\"...")); // Test modules


    var success = true;
    return (0, _promise.runSequential)(modules, function (name) {
      var prefix = "[".concat((0, _padEnd.default)(name, 40), "]"); // Build repository name

      var repository = name.replace('@radon-extension/', 'radon-extension-'); // Test module

      return testModule(_path.default.join(target, '.modules', repository), prefix).catch(function (err) {
        _vorpal.default.logger.error("".concat(prefix, " ").concat(_chalk.default.red("Error (code: ".concat(err.code || null, ")")))); // Mark as failed


        success = false;
      });
    }).then(function () {
      if (!success) {
        return Promise.reject(new Error('Tests failed'));
      }

      return true;
    });
  });
} // Command


var cmd = _vorpal.default.command('travis:test', 'Test modules in travis environment.').option('--target <target>', 'Target package [default: ./]'); // Action


cmd.action(function (_ref2) {
  var options = _ref2.options;

  var target = _path.default.resolve(options.target || _process.default.cwd()); // Run task


  return test(target).catch(function (err) {
    _vorpal.default.logger.error(err && err.stack ? err.stack : err);

    _process.default.exit(1);
  });
});