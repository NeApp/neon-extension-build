"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.readJson = readJson;
exports["default"] = void 0;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var writeJson = _fsExtra["default"].writeJson;

function readJson(path) {
  var defaultValue = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  return _fsExtra["default"].readJson(path)["catch"](function (err) {
    if (err && err.code === 'ENOENT') {
      return defaultValue;
    }

    return Promise.reject(err);
  });
}

var _default = {
  read: readJson,
  readJson: readJson,
  write: writeJson,
  writeJson: writeJson
};
exports["default"] = _default;