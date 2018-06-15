"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.default = void 0;

var _gentleFs = _interopRequireDefault(require("gentle-fs"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function create(link, target, prefixes) {
  if ((0, _isNil.default)(link)) {
    return Promise.reject(new Error('Invalid value provided for the "link" parameter'));
  }

  if ((0, _isNil.default)(target)) {
    return Promise.reject(new Error('Invalid value provided for the "target" parameter'));
  }

  if ((0, _isNil.default)(prefixes)) {
    return Promise.reject(new Error('Invalid value provided for the "prefixes" parameter'));
  }

  return new Promise(function (resolve, reject) {
    _gentleFs.default.link(target, link, {
      prefixes: prefixes
    }, function (err) {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

var _default = {
  create: create
};
exports.default = _default;