"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createZip = createZip;

var _fs = _interopRequireDefault(require("fs"));

var _glob = _interopRequireDefault(require("glob"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _path = _interopRequireDefault(require("path"));

var _yazl = _interopRequireDefault(require("yazl"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function createZip(options) {
  options = (0, _merge["default"])({
    mode: 100664,
    mtime: new Date(2017, 0)
  }, options || {});
  return new Promise(function (resolve, reject) {
    (0, _glob["default"])("".concat(options.source, "/").concat(options.pattern), function (err, files) {
      if (err) {
        reject(err);
        return;
      }

      files.sort(); // Create archive

      var zip = new _yazl["default"].ZipFile();

      for (var i = 0; i < files.length; i++) {
        var file = _fs["default"].lstatSync(files[i]);

        if (file.isDirectory()) {
          continue;
        }

        zip.addFile(files[i], _path["default"].relative(options.source, files[i]), {
          mode: parseInt(options.mode, 8),
          mtime: options.mtime
        });
      } // Save archive


      zip.end(function () {
        var writeStream = _fs["default"].createWriteStream(options.archive).on('error', function (err) {
          return reject(err);
        }); // Write zip to file stream


        zip.outputStream.on('finish', function () {
          return resolve();
        });
        zip.outputStream.pipe(writeStream);
      });
    });
  });
}