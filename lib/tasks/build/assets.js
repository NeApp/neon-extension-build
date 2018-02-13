"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Assets = void 0;

var _chalk = _interopRequireDefault(require("chalk"));

var _fs = _interopRequireDefault(require("fs"));

var _glob = _interopRequireDefault(require("glob"));

var _map = _interopRequireDefault(require("lodash/map"));

var _mkdirp = _interopRequireDefault(require("mkdirp"));

var _padEnd = _interopRequireDefault(require("lodash/padEnd"));

var _path = _interopRequireDefault(require("path"));

var _clean = _interopRequireDefault(require("../clean"));

var _helpers = require("../../core/helpers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Pattern = '**/*.{css,eot,html,js,png,svg,ttf,woff}';

function copyFile(sourcePath, outputPath) {
  return new Promise(function (resolve, reject) {
    // Ensure output directory exists
    _mkdirp.default.sync(_path.default.dirname(outputPath)); // Copy file to output path


    _fs.default.createReadStream(sourcePath).pipe(_fs.default.createWriteStream(outputPath).on('error', function (err) {
      return reject(err);
    }).on('finish', function () {
      return resolve(outputPath);
    }));
  });
}

function copy(basePath, outputPath) {
  return new Promise(function (resolve, reject) {
    (0, _glob.default)("".concat(basePath, "/").concat(Pattern), function (err, files) {
      if (err) {
        reject(err);
        return;
      } // Copy matched files to output directory


      var promises = files.map(function (filePath) {
        return copyFile(filePath, _path.default.join(outputPath, _path.default.relative(basePath, filePath)));
      }); // Wait until all files have been copied

      resolve(Promise.all(promises));
    });
  });
}

var Assets = _helpers.Task.create({
  name: 'build:assets',
  description: 'Build extension assets.',
  required: [_clean.default]
}, function (log, browser, environment) {
  // Ensure output directory exists
  _mkdirp.default.sync(environment.outputPath); // Copy assets to build directory


  return Promise.all((0, _map.default)(browser.modules, function (module) {
    var destinationPath = environment.outputPath;

    var sourcePath = _path.default.join(module.path, 'assets'); // Ensure source path exists


    if (!_fs.default.existsSync(sourcePath)) {
      return Promise.resolve();
    } // Add module name suffix to output directory


    if (['destination', 'source'].indexOf(module.type) >= 0) {
      destinationPath = _path.default.join(destinationPath, module.name.replace('neon-extension-', '').replace('-', _path.default.sep));
    } // Copy module assets to build directory


    return copy(sourcePath, destinationPath).then(function (files) {
      log.info(_chalk.default.green("[".concat((0, _padEnd.default)(module.name, 35), "] Copied ").concat(files.length, " asset(s)")));
    }, function (err) {
      log.info(_chalk.default.red("[".concat((0, _padEnd.default)(module.name, 35), "] Unable to copy assets: ").concat(err.message)));
      return Promise.reject(err);
    });
  }));
});

exports.Assets = Assets;
var _default = Assets;
exports.default = _default;