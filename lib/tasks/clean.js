"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Clean = void 0;

var _del = _interopRequireDefault(require("del"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _helpers = require("../core/helpers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Clean = _helpers.Task.create({
  name: 'clean',
  description: 'Clean the build environment.'
}, function (log, browser, environment) {
  var path = _path.default.join(environment.options['build-dir'], browser.name, environment.name);

  if (!_fs.default.existsSync(path)) {
    log.info('Skipping - Path doesn\'t exist');
    return Promise.resolve();
  }

  log.debug('Cleaning the build directory...');
  log.debug(" - Path: \"".concat(path, "\""));
  return (0, _del.default)([_path.default.join(path, '**/*')], {
    force: true
  }).then(function () {
    log.debug('Done');
  });
});

exports.Clean = Clean;
var _default = Clean;
exports.default = _default;