#!/usr/bin/env node
"use strict";

var _vorpal = _interopRequireDefault(require("./core/vorpal"));

require("./tasks");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_vorpal.default.show().parse(process.argv);