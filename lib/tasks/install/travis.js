"use strict";

var _path = _interopRequireDefault(require("path"));

var _process = _interopRequireDefault(require("process"));

var _npm = _interopRequireDefault(require("../../core/npm"));

var _vorpal = _interopRequireDefault(require("../../core/vorpal"));

var _package = require("../../core/package");

var _promise = require("../../core/helpers/promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var cmd = _vorpal.default.command('install:travis <branch>', 'Install travis environment.').option('--target <target>', 'Target package [default: ./]'); // Action


cmd.action(function (_ref) {
  var branch = _ref.branch,
      options = _ref.options;

  var target = _path.default.resolve(options.target || _process.default.cwd());

  var path = _path.default.resolve(target, 'package.json'); // Find package modules


  return (0, _package.getPackageModules)(path).then(function (modules) {
    _vorpal.default.logger.info("Installing ".concat(modules.length, " module(s) to \"").concat(target, "\"...")); // Install modules sequentially


    return (0, _promise.runSequential)(modules, function (name) {
      return _npm.default.installModule(name, branch, {
        cwd: target
      });
    });
  }).catch(function (err) {
    _vorpal.default.logger.error(err.stack || err.message || err);

    _process.default.exit(1);
  });
});