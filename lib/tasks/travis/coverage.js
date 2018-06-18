"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.coverage = coverage;

var _istanbulCombine = _interopRequireDefault(require("istanbul-combine"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _path = _interopRequireDefault(require("path"));

var _process = _interopRequireDefault(require("process"));

var _vorpal = _interopRequireDefault(require("../../core/vorpal"));

var _package = require("../../core/package");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function coverage(target) {
  // Read package details
  return _fsExtra.default.readJson(_path.default.join(target, 'package.json')).then(function (pkg) {
    var modules = (0, _package.getPackageModules)(pkg);

    _vorpal.default.logger.debug("Combining coverage from ".concat(modules.length, " module(s) in ") + "\"".concat(_path.default.relative(_process.default.cwd(), target) || ".".concat(_path.default.sep), "\"...")); // Combine coverage


    return (0, _istanbulCombine.default)({
      pattern: '.modules/*/Build/Coverage/coverage-*.json',
      base: '.modules/',
      dir: 'Build/Coverage/',
      print: 'summary',
      reporters: {
        html: {},
        lcovonly: {}
      }
    });
  });
} // Command


var cmd = _vorpal.default.command('travis:coverage', 'Combine coverage from modules in the travis environment.').option('--target <target>', 'Target package [default: ./]'); // Action


cmd.action(function (_ref) {
  var options = _ref.options;

  var target = _path.default.resolve(options.target || _process.default.cwd()); // Run task


  return coverage(target).catch(function (err) {
    _vorpal.default.logger.error(err && err.stack ? err.stack : err);

    _process.default.exit(1);
  });
});