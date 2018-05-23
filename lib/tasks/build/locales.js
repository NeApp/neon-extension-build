"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Locales = void 0;

var _chalk = _interopRequireDefault(require("chalk"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _map = _interopRequireDefault(require("lodash/map"));

var _mkdirp = _interopRequireDefault(require("mkdirp"));

var _padEnd = _interopRequireDefault(require("lodash/padEnd"));

var _path = _interopRequireDefault(require("path"));

var _copy = _interopRequireDefault(require("../../core/copy"));

var _helpers = require("../../core/helpers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function copyLocaleNamespaces(log, module, language, destinationPath) {
  var localePath = _path.default.join(module.path, 'locales', language);

  if (!_fsExtra.default.existsSync(localePath)) {
    return Promise.resolve();
  } // Retrieve module name


  var moduleName = module.name;

  if (moduleName === 'neon-extension-core') {
    moduleName = 'neon-extension';
  } // Copy locale namespaces to the build directory


  return (0, _copy.default)('**/*.json', localePath, "".concat(destinationPath, "/").concat(language, "/").concat(moduleName)).then(function (files) {
    log.info(_chalk.default.green("[".concat((0, _padEnd.default)(module.name, 40), "](").concat(language, ") Copied ").concat(files.length, " namespace(s)")));
  }, function (err) {
    log.info(_chalk.default.red("[".concat((0, _padEnd.default)(module.name, 40), "] Unable to copy locales: ").concat(err.message)));
    return Promise.reject(err);
  });
}

var Locales = _helpers.Task.create({
  name: 'build:locales',
  description: 'Build extension locales.',
  required: ['clean']
}, function (log, browser, environment) {
  var destinationPath = _path.default.join(environment.outputPath, 'Locales'); // Ensure output directory exists


  _mkdirp.default.sync(destinationPath); // Copy locales to the build directory


  return Promise.all((0, _map.default)(browser.modules, function (module) {
    var localesPath = _path.default.join(module.path, 'locales');

    if (!_fsExtra.default.existsSync(localesPath)) {
      return Promise.resolve();
    } // Copy locale namespaces to the build directory


    return _fsExtra.default.readdir(localesPath).then(function (languages) {
      return Promise.all((0, _map.default)(languages, function (language) {
        return copyLocaleNamespaces(log, module, language, destinationPath);
      }));
    });
  }));
});

exports.Locales = Locales;
var _default = Locales;
exports.default = _default;