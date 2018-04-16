"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _util = _interopRequireDefault(require("util"));

var _vorpal = _interopRequireDefault(require("vorpal"));

var _vorpalLog = _interopRequireDefault(require("vorpal-log"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var vorpal = (0, _vorpal.default)().use(_vorpalLog.default).delimiter('neon-extension-build$');

function log(msg) {
  if (typeof msg === 'string') {
    if (vorpal.logger.options.preformat != null) {
      msg = vorpal.logger.options.preformat(msg);
    }
  } else {
    msg = _util.default.inspect(msg);
  }

  return "".concat(vorpal.logger.printDate()).concat(msg);
} // Setup logger formats


vorpal.logger.addFormatter('debug', 10, log);
vorpal.logger.addFormatter('info', 20, log);
vorpal.logger.addFormatter('warn', 30, log);
vorpal.logger.addFormatter('error', 40, log);
vorpal.logger.addFormatter('fatal', 50, log);
var _default = vorpal;
exports.default = _default;