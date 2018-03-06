"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isDirectory = isDirectory;
exports.isFile = isFile;
exports.resolvePath = resolvePath;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function isDirectory(path) {
  if (!_fsExtra.default.existsSync(path)) {
    return false;
  }

  return _fsExtra.default.lstatSync(path).isDirectory();
}

function isFile(path) {
  if (!_fsExtra.default.existsSync(path)) {
    return false;
  }

  return _fsExtra.default.lstatSync(path).isFile();
}

function resolvePath() {
  for (var _len = arguments.length, paths = new Array(_len), _key = 0; _key < _len; _key++) {
    paths[_key] = arguments[_key];
  }

  if (paths.length === 1 && Array.isArray(paths)) {
    paths = paths[0];
  }

  for (var i = 0; i < paths.length; i++) {
    if (_fsExtra.default.existsSync(paths[i])) {
      return _fsExtra.default.realpathSync(paths[i]);
    }
  }

  return null;
}