"use strict";

var _fs = _interopRequireDefault(require("fs"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_fs.default.readdirSync(__dirname).forEach(function (name) {
  try {
    require("./".concat(name));
  } catch (e) {
    console.warn("Unable to import \"./".concat(name, "\": ").concat(e));
  }
});