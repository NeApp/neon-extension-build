#!/usr/bin/env node
"use strict";

var _vorpal = _interopRequireDefault(require("./core/vorpal"));

require("./tasks");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

process.on('unhandledRejection', function (reason, p) {
  _vorpal["default"].logger.error('Unhandled rejection for promise:', p);

  _vorpal["default"].logger.error(' - reason:', reason); // Exit process


  process.exit(1);
});

_vorpal["default"].show().parse(process.argv);