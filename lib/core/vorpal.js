"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _vorpal = _interopRequireDefault(require("vorpal"));

var _vorpalLog = _interopRequireDefault(require("vorpal-log"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var vorpal = (0, _vorpal.default)().use(_vorpalLog.default).delimiter('neon-extension-build$');
var _default = vorpal;
exports.default = _default;