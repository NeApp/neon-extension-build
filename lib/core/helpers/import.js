"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.importGlob = importGlob;
exports["default"] = void 0;

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _glob = _interopRequireDefault(require("glob"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _isString = _interopRequireDefault(require("lodash/isString"));

var _vorpal = _interopRequireDefault(require("../vorpal"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Logger = _vorpal["default"].logger;

function importGlob(path, options) {
  if ((0, _isString["default"])(options)) {
    options = {
      pattern: options
    };
  } else if ((0, _isNil["default"])(options)) {
    options = _objectSpread({
      pattern: '*.js',
      ignore: '{index,*.spec}.js'
    }, options);
  } // Validate options


  if (!(0, _isPlainObject["default"])(options)) {
    throw new Error('Invalid value provided for the "options" parameter ' + '(expected pattern string, or options object)');
  }

  if ((0, _isNil["default"])(options.pattern)) {
    throw new Error('Missing required option: pattern');
  } // Find files matching the glob pattern


  var files;

  try {
    files = _glob["default"].sync(options.pattern, {
      cwd: path,
      ignore: options.ignore,
      absolute: true,
      nodir: true
    });
  } catch (e) {
    Logger.error("Unable to find modules: ".concat(e.message || e));
    return;
  } // Import modules


  (0, _forEach["default"])(files, function (name) {
    try {
      require(name);
    } catch (e) {
      Logger.warn("Unable to import \"".concat(name, "\": ").concat(e, " ").concat(e && e.stack));
    }
  });
}

var _default = importGlob;
exports["default"] = _default;