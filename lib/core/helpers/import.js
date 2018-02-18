"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.importGlob = importGlob;
exports.default = void 0;

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _glob = _interopRequireDefault(require("glob"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _isString = _interopRequireDefault(require("lodash/isString"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function importGlob(path, options) {
  if ((0, _isString.default)(options)) {
    options = {
      pattern: options
    };
  } else if ((0, _isNil.default)(options)) {
    options = _extends({
      pattern: '*.js',
      ignore: '{index,*.spec}.js'
    }, options);
  } // Validate options


  if (!(0, _isPlainObject.default)(options)) {
    throw new Error('Invalid value provided for the "options" parameter ' + '(expected pattern string, or options object)');
  }

  if ((0, _isNil.default)(options.pattern)) {
    throw new Error('Missing required option: pattern');
  } // Find files matching the glob pattern


  var files;

  try {
    files = _glob.default.sync(options.pattern, {
      cwd: path,
      ignore: options.ignore,
      absolute: true,
      nodir: true
    });
  } catch (e) {
    console.error("Unable to find modules: ".concat(e.message || e));
    return;
  } // Import modules


  (0, _forEach.default)(files, function (name) {
    try {
      require(name);
    } catch (e) {
      console.warn("Unable to import \"".concat(name, "\": ").concat(e));
    }
  });
}

var _default = importGlob;
exports.default = _default;