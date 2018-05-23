"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.capitalize = capitalize;
exports.sortKey = sortKey;

var _isNil = _interopRequireDefault(require("lodash/isNil"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function capitalize(value) {
  if ((0, _isNil.default)(value) || value.length < 1) {
    return value;
  }

  return value[0].toUpperCase() + value.substring(1);
}

function sortKey(value) {
  if ((0, _isNil.default)(value)) {
    return null;
  }

  return value.replace(/[^a-zA-Z]/g, '').toLowerCase();
}