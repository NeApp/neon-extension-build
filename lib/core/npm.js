"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getBranches = getBranches;
exports.install = install;
exports.installModule = installModule;
exports.default = void 0;

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _child_process = require("child_process");

var _github = _interopRequireDefault(require("./github"));

var _vorpal = _interopRequireDefault(require("./vorpal"));

var _promise = require("./helpers/promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getBranches(current) {
  var branches;

  if (current.indexOf('v') === 0) {
    branches = ['master'];
  } else {
    branches = ['develop', 'master'];
  } // Find existing position of `current`


  var i = branches.indexOf(current);

  if (i < 0) {
    // Add current branch to front
    branches.unshift(current);
  } else if (i > 0) {
    // Move current branch to front
    branches.splice(i, 1);
    branches.unshift(current);
  }

  return branches;
}

function install(name, options) {
  return new Promise(function (resolve, reject) {
    (0, _child_process.exec)("npm install ".concat(name), options, function (err, stdout, stderr) {
      if (!(0, _isNil.default)(err)) {
        reject(err);
        return;
      } // Resolve promise


      resolve({
        stdout: stdout,
        stderr: stderr
      });
    });
  });
}

function installModule(name, branch, _ref) {
  var cwd = _ref.cwd;
  return (0, _promise.resolveOne)(getBranches(branch), function (branch) {
    return (// Check if branch exists
      _github.default.exists(name, branch).then(function () {
        _vorpal.default.logger.info("[NeApp/".concat(name, "#").concat(branch, "] Installing...")); // Install module


        return install("NeApp/".concat(name, "#").concat(branch), {
          cwd: cwd
        }).then(function (_ref2) {
          var stdout = _ref2.stdout,
              stderr = _ref2.stderr;

          if (!(0, _isNil.default)(stderr)) {
            (0, _forEach.default)(stderr.trim().split('\n'), function (line) {
              var type;

              if (line.startsWith('npm ERR')) {
                type = 'error';
                line = line.substring(9);
              } else if (line.startsWith('npm WARN')) {
                type = 'warn';
                line = line.substring(9);
              } // Log message


              if (line.indexOf('requires a peer of') >= 0) {
                // Peer dependency message
                _vorpal.default.logger.debug("[NeApp/".concat(name, "#").concat(branch, "] ").concat(line));
              } else if (line.endsWith('loglevel="notice"')) {
                // Notice
                _vorpal.default.logger.debug("[NeApp/".concat(name, "#").concat(branch, "] ").concat(line));
              } else if (type === 'error') {
                // Error
                _vorpal.default.logger.error("[NeApp/".concat(name, "#").concat(branch, "] ").concat(line));
              } else if (type === 'warn') {
                // Warning
                _vorpal.default.logger.warn("[NeApp/".concat(name, "#").concat(branch, "] ").concat(line));
              } else {
                // Unknown level
                _vorpal.default.logger.info("[NeApp/".concat(name, "#").concat(branch, "] ").concat(line));
              }
            });
          }

          if (!(0, _isNil.default)(stdout)) {
            (0, _forEach.default)(stdout.trim().split('\n'), function (line) {
              return _vorpal.default.logger.info("[NeApp/".concat(name, "#").concat(branch, "] ").concat(line));
            });
          }
        }, function (err) {
          _vorpal.default.logger.warn("[NeApp/".concat(name, "#").concat(branch, "] Exited with return code: ").concat(err.code));

          return Promise.reject(err);
        });
      }, function (err) {
        _vorpal.default.logger.warn("[NeApp/".concat(name, "#").concat(branch, "] Error raised: ").concat(err.message || err));

        return Promise.reject(err);
      })
    );
  });
}

var _default = {
  install: install,
  installModule: installModule
};
exports.default = _default;