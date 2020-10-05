"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calculate = calculate;
exports.calculateMany = calculateMany;
exports.writeMany = writeMany;
exports["default"] = void 0;

var _assign = _interopRequireDefault(require("lodash/assign"));

var _crypto = _interopRequireDefault(require("crypto"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _glob = _interopRequireDefault(require("glob"));

var _map = _interopRequireDefault(require("lodash/map"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function calculate(path) {
  return _fsExtra["default"].readFile(path).then(function (data) {
    return _crypto["default"].createHash('md5').update(data, 'binary').digest('hex');
  });
}

function calculateMany(base, source) {
  return new Promise(function (resolve, reject) {
    (0, _glob["default"])(_path["default"].join(base, source), function (err, files) {
      if (err) {
        reject(err);
        return;
      } // Calculate hashes for each file


      resolve(Promise.all((0, _map["default"])(files, function (path) {
        var stats = _fsExtra["default"].statSync(path); // Ignore directories


        if (stats.isDirectory()) {
          return {};
        } // Calculate file checksum


        var name = _path["default"].relative(base, path).replace(/\\/g, '/');

        var result = {};
        return calculate(path).then(function (hash) {
          result[name] = hash;
          return result;
        });
      })).then(function (hashes) {
        return _assign["default"].apply(void 0, [{}].concat(_toConsumableArray(hashes)));
      }));
    });
  });
}

function encodeHashes(hashes) {
  var lines = (0, _map["default"])(Object.keys(hashes).sort(), function (key) {
    return "".concat(hashes[key], "  ").concat(key, "\n");
  });
  return lines.join('');
}

function writeMany(base, source) {
  var destination = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'MD5SUMS';
  return calculateMany(base, source).then(function (hashes) {
    return _fsExtra["default"].writeFile(_path["default"].join(base, destination), encodeHashes(hashes));
  });
}

var _default = {
  calculate: calculate,
  writeMany: writeMany
};
exports["default"] = _default;