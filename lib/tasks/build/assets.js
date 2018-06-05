"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Assets = void 0;

var _chalk = _interopRequireDefault(require("chalk"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _map = _interopRequireDefault(require("lodash/map"));

var _mkdirp = _interopRequireDefault(require("mkdirp"));

var _padEnd = _interopRequireDefault(require("lodash/padEnd"));

var _path = _interopRequireDefault(require("path"));

var _copy = _interopRequireDefault(require("../../core/copy"));

var _helpers = require("../../core/helpers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Pattern = '**/*.{css,eot,html,js,png,svg,ttf,woff}';

var Assets = _helpers.Task.create({
  name: 'build:assets',
  description: 'Build extension assets.',
  required: ['clean']
}, function (log, browser, environment) {
  // Ensure output directory exists
  _mkdirp.default.sync(environment.outputPath); // Copy assets to build directory


  return Promise.all((0, _map.default)(browser.modules, function (module) {
    var src = _path.default.join(module.path, 'Assets');

    var dest = environment.outputPath; // Ensure source path exists

    if (!_fsExtra.default.existsSync(src)) {
      return Promise.resolve();
    } // Add module name suffix to output directory


    if (['destination', 'source'].indexOf(module.type) >= 0) {
      dest = _path.default.join(dest, "Modules/".concat(module.name));
    } // Copy module assets to build directory


    return (0, _copy.default)(Pattern, src, dest).then(function (files) {
      log.info(_chalk.default.green("[".concat((0, _padEnd.default)(module.name, 40), "] Copied ").concat(files.length, " asset(s)")));
    }, function (err) {
      log.info(_chalk.default.red("[".concat((0, _padEnd.default)(module.name, 40), "] Unable to copy assets: ").concat(err.message)));
      return Promise.reject(err);
    });
  }));
});

exports.Assets = Assets;
var _default = Assets;
exports.default = _default;