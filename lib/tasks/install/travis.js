"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getBranches = getBranches;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _filter = _interopRequireDefault(require("lodash/filter"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _https = _interopRequireDefault(require("https"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _path = _interopRequireDefault(require("path"));

var _process = _interopRequireDefault(require("process"));

var _child_process = require("child_process");

var _vorpal = _interopRequireDefault(require("../../core/vorpal"));

var _promise = require("../../core/helpers/promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var cmd = _vorpal.default.command('install:travis <branch>', 'Install travis environment.').option('--target <target>', 'Target package [default: ./]');

function exists(name, branch) {
  return new Promise(function (resolve, reject) {
    var req = _https.default.request({
      method: 'HEAD',
      protocol: 'https:',
      hostname: 'github.com',
      port: 443,
      path: "/NeApp/".concat(name, "/tree/").concat(branch)
    }, function (res) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error('Branch doesn\'t exist'));
      }
    }); // Send request


    req.end();
  });
}

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

function getPackageModules(path) {
  return _fsExtra.default.readJson(path).then(function (pkg) {
    var match = /^neon-extension-(\w+)$/.exec(pkg.name);

    if ((0, _isNil.default)(match) || ['build', 'core', 'framework'].indexOf(match[1]) >= 0) {
      return Promise.reject(new Error("Invalid package: ".concat(pkg.name, " (expected current directory to contain a browser package)")));
    } // Find package modules


    return (0, _filter.default)(Object.keys(pkg.dependencies), function (name) {
      return name.indexOf('neon-extension-') === 0 && ['neon-extension-build'].indexOf(name) < 0;
    });
  });
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
      exists(name, branch).then(function () {
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
} // Action


cmd.action(function (_ref3) {
  var branch = _ref3.branch,
      options = _ref3.options;

  var target = _path.default.resolve(options.target || _process.default.cwd());

  var path = _path.default.resolve(target, 'package.json'); // Find package modules


  return getPackageModules(path).then(function (modules) {
    _vorpal.default.logger.info("Installing ".concat(modules.length, " module(s) to \"").concat(target, "\"...")); // Install modules sequentially


    return (0, _promise.runSequential)(modules, function (name) {
      return installModule(name, branch, {
        cwd: target
      });
    });
  }).catch(function (err) {
    _vorpal.default.logger.error(err.stack || err.message || err);

    _process.default.exit(1);
  });
});