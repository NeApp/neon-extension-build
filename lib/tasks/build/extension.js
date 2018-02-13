"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Extension = void 0;

var _chalk = _interopRequireDefault(require("chalk"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _mkdirp = _interopRequireDefault(require("mkdirp"));

var _padEnd = _interopRequireDefault(require("lodash/padEnd"));

var _path = _interopRequireDefault(require("path"));

var _reduce = _interopRequireDefault(require("lodash/reduce"));

var _util = _interopRequireDefault(require("util"));

var _webpack = _interopRequireDefault(require("webpack"));

var _clean = _interopRequireDefault(require("../clean"));

var _helpers = require("../../core/helpers");

var _webpack2 = require("../../webpack");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function constructCompiler(browser, environment) {
  // Generate configuration
  var configuration;

  try {
    configuration = (0, _webpack2.createConfiguration)(browser, environment);
  } catch (e) {
    throw new Error("Unable to generate configuration: ".concat(e.stack));
  } // Ensure output directory exists


  _mkdirp.default.sync(environment.outputPath); // Save configuration


  _fsExtra.default.writeFileSync(_path.default.join(environment.buildPath, 'webpack.config.js'), _util.default.inspect(configuration, {
    depth: null
  }), 'utf-8'); // Construct compiler


  return (0, _webpack.default)(configuration);
}

function runCompiler(compiler) {
  return new Promise(function (resolve, reject) {
    compiler.run(function (err, stats) {
      if (!(0, _isNil.default)(err)) {
        reject(err);
      } else {
        resolve(stats);
      }
    });
  });
}

function writeStats(environment, stats) {
  return _fsExtra.default.writeJson(_path.default.join(environment.buildPath, 'webpack.stats.json'), stats.toJson('verbose'));
}

var Extension = _helpers.Task.create({
  name: 'build:extension',
  description: 'Build extension modules.',
  required: [_clean.default]
}, function (log, browser, environment) {
  // Construct compiler
  var compiler;

  try {
    compiler = constructCompiler(browser, environment);
  } catch (e) {
    return Promise.reject(e);
  } // Run compiler


  return runCompiler(compiler).then(function (stats) {
    // Log statistics
    log.info(stats.toString('normal')); // Write statistics to file

    writeStats(environment, stats); // Exit if there is any errors

    if (stats.hasErrors()) {
      return Promise.reject(new Error('Build failed'));
    }

    return stats;
  }) // Display extracted modules
  .then(function () {
    var extracted = environment.webpack.extracted;

    if (Object.keys(extracted).length < 1) {
      return Promise.reject(new Error('No modules were extracted'));
    }

    var nameLength = (0, _reduce.default)(Object.keys(extracted), function (result, name) {
      if (name.length > result) {
        return name.length;
      }

      return result;
    }, 0);
    (0, _forEach.default)(Object.keys(extracted).sort(), function (name) {
      log.debug(_chalk.default.green("".concat((0, _padEnd.default)(name, nameLength), " => ").concat(extracted[name])));
    });
    return extracted;
  });
});

exports.Extension = Extension;
var _default = Extension;
exports.default = _default;