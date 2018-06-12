"use strict";

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _gentleFs = _interopRequireDefault(require("gentle-fs"));

var _mkdirp = _interopRequireDefault(require("mkdirp"));

var _path = _interopRequireDefault(require("path"));

var _process = _interopRequireDefault(require("process"));

var _git = _interopRequireDefault(require("../../core/git"));

var _github = _interopRequireDefault(require("../../core/github"));

var _npm = _interopRequireDefault(require("../../core/npm"));

var _vorpal = _interopRequireDefault(require("../../core/vorpal"));

var _package = require("../../core/package");

var _promise = require("../../core/helpers/promise");

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

function install(name, branch, _ref) {
  var cwd = _ref.cwd;

  var modulesPath = _path.default.join(cwd, '.modules'); // Remove directory (if it already exists)


  if (_fsExtra.default.existsSync(modulesPath)) {
    _fsExtra.default.removeSync(modulesPath);
  } // Ensure directory exists


  _mkdirp.default.sync(modulesPath); // Install module


  return (0, _promise.resolveOne)(getBranches(branch), function (branch) {
    return _github.default.exists(name, branch).then(function () {
      var localPath = _path.default.join(modulesPath, name);

      return Promise.resolve().then(function () {
        _vorpal.default.logger.info("[NeApp/".concat(name, "#").concat(branch, "] Cloning to \"").concat(_path.default.relative(_process.default.cwd(), localPath), "...")); // Clone repository


        return _git.default.clone(modulesPath, "https://github.com/NeApp/".concat(name, ".git"), localPath, ['--depth 1', "-b ".concat(branch)]);
      }).then(function () {
        _vorpal.default.logger.info("[NeApp/".concat(name, "#").concat(branch, "] Installing dependencies...")); // Install dependencies


        return _npm.default.install({
          cwd: localPath
        }).then(_npm.default.createHandler(_vorpal.default.logger, "[NeApp/".concat(name, "#").concat(branch, "]")));
      }).then(function () {
        _vorpal.default.logger.info("[NeApp/".concat(name, "#").concat(branch, "] Creating symbolic link..."));

        return new Promise(function (resolve, reject) {
          // Create symbolic link to module
          _gentleFs.default.link(localPath, "".concat(cwd, "/node_modules/").concat(name), {
            prefixes: ["".concat(cwd, "/node_modules/"), modulesPath]
          }, function (err) {
            if (err) {
              reject(err);
              return;
            }

            resolve();
          });
        });
      }).catch(function (err) {
        _vorpal.default.logger.error("[NeApp/".concat(name, "#").concat(branch, "] Unable to install module: ").concat(err));
      });
    }, function (err) {
      _vorpal.default.logger.warn("[NeApp/".concat(name, "#").concat(branch, "] Error raised: ").concat(err.message || err));

      return Promise.reject(err);
    });
  });
} // Command


var cmd = _vorpal.default.command('travis:install <branch>', 'Install travis environment.').option('--target <target>', 'Target package [default: ./]'); // Action


cmd.action(function (_ref2) {
  var branch = _ref2.branch,
      options = _ref2.options;

  var target = _path.default.resolve(options.target || _process.default.cwd());

  var path = _path.default.resolve(target, 'package.json'); // Find package modules


  return (0, _package.getPackageModules)(path).then(function (modules) {
    _vorpal.default.logger.info("Installing ".concat(modules.length, " module(s) to \"").concat(_path.default.relative(_process.default.cwd(), target) || ".".concat(_path.default.sep), "\"...")); // Install modules sequentially


    return (0, _promise.runSequential)(modules, function (name) {
      return install(name, branch, {
        cwd: target
      });
    });
  }).catch(function (err) {
    _vorpal.default.logger.error(err.stack || err.message || err);

    _process.default.exit(1);
  });
});