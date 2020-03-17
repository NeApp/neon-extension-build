"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.copyFile = copyFile;
exports.copyTextFile = copyTextFile;
exports["default"] = copy;

var _eol = _interopRequireDefault(require("eol"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _glob = _interopRequireDefault(require("glob"));

var _mkdirp = _interopRequireDefault(require("mkdirp"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var TextExtensions = ['.css', '.html', '.js', '.json', '.svg'];

function copyFile(src, dest) {
  return new Promise(function (resolve, reject) {
    // Ensure output directory exists
    _mkdirp["default"].sync(_path["default"].dirname(dest)); // Copy file to output path


    _fsExtra["default"].createReadStream(src).pipe(_fsExtra["default"].createWriteStream(dest).on('error', function (err) {
      return reject(err);
    }).on('finish', function () {
      return resolve(dest);
    }));
  });
}

function copyTextFile(src, dest) {
  // Ensure output directory exists
  _mkdirp["default"].sync(_path["default"].dirname(dest)); // Read file


  return _fsExtra["default"].readFile(src, 'utf-8').then(function (data) {
    // Convert `data` line endings to LF, and write to file
    return _fsExtra["default"].writeFile(dest, _eol["default"].lf(data));
  });
}

function copy(pattern, src, dest) {
  return new Promise(function (resolve, reject) {
    (0, _glob["default"])("".concat(src, "/").concat(pattern), function (err, files) {
      if (err) {
        reject(err);
        return;
      } // Copy matched files to output directory


      var promises = files.map(function (fileSrc) {
        var file = _fsExtra["default"].lstatSync(fileSrc);

        if (file.isDirectory()) {
          return Promise.resolve();
        }

        var fileDest = _path["default"].join(dest, _path["default"].relative(src, fileSrc));

        var ext = _path["default"].extname(fileSrc);

        if (TextExtensions.indexOf(ext) >= 0) {
          // Copy text file to build directory
          return copyTextFile(fileSrc, fileDest);
        } // Copy binary file to build directory


        return copyFile(fileSrc, fileDest);
      }); // Wait until all files have been copied

      resolve(Promise.all(promises));
    });
  });
}