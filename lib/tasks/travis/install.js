"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getBranches = getBranches;
exports.clone = clone;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _gentleFs = _interopRequireDefault(require("gentle-fs"));

var _mkdirp = _interopRequireDefault(require("mkdirp"));

var _path = _interopRequireDefault(require("path"));

var _process = _interopRequireDefault(require("process"));

var _git = _interopRequireDefault(require("../../core/git"));

var _github = _interopRequireDefault(require("../../core/github"));

var _npm = _interopRequireDefault(require("../../core/npm"));

var _vorpal = _interopRequireDefault(require("../../core/vorpal"));

var _browser = require("../../core/browser");

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

function clone(target, branch, name) {
  var modulesPath = _path.default.join(target, '.modules'); // Remove directory (if it already exists)


  if (_fsExtra.default.existsSync(modulesPath)) {
    _fsExtra.default.removeSync(modulesPath);
  } // Ensure directory exists


  _mkdirp.default.sync(modulesPath); // Install module


  return (0, _promise.resolveOne)(getBranches(branch), function (branch) {
    return _github.default.exists(name, branch).then(function () {
      var localPath = _path.default.join(modulesPath, name);

      _vorpal.default.logger.info("[NeApp/".concat(name, "#").concat(branch, "] Cloning to \"").concat(_path.default.relative(_process.default.cwd(), localPath), "...")); // Clone repository


      return _git.default.clone(modulesPath, "https://github.com/NeApp/".concat(name, ".git"), localPath, ['-b', branch, '--depth', '1']).then(function () {
        return {
          branch: branch,
          localPath: localPath
        };
      });
    });
  });
}

function link(target, branch, name) {
  // Clone repository for module
  return clone(target, branch, name).then(function (_ref) {
    var branch = _ref.branch,
        localPath = _ref.localPath;

    _vorpal.default.logger.info("[NeApp/".concat(name, "#").concat(branch, "] Installing dependencies...")); // Install dependencies


    return _npm.default.install(localPath).then(_npm.default.createHandler(_vorpal.default.logger, "[NeApp/".concat(name, "#").concat(branch, "]"))).then(function () {
      _vorpal.default.logger.info("[NeApp/".concat(name, "#").concat(branch, "] Linking to \"node_modules/").concat(name, "\"..."));

      return new Promise(function (resolve, reject) {
        // Create symbolic link to module
        _gentleFs.default.link(localPath, "".concat(target, "/node_modules/").concat(name), {
          prefixes: ["".concat(target, "/.modules/"), "".concat(target, "/node_modules/")]
        }, function (err) {
          if (err) {
            reject(err);
            return;
          }

          resolve();
        });
      });
    });
  }).catch(function (err) {
    _vorpal.default.logger.warn("[NeApp/".concat(name, "#").concat(branch, "] Error raised: ").concat(err.message || err));

    return Promise.reject(err);
  });
}

function pack(target, branch, name) {
  // Clone repository for module
  return clone(target, branch, name).then(function (_ref2) {
    var branch = _ref2.branch,
        localPath = _ref2.localPath;

    _vorpal.default.logger.info("[NeApp/".concat(name, "#").concat(branch, "] Packing module...")); // Pack module


    return _npm.default.pack(target, localPath).then(function (_ref3) {
      var stdout = _ref3.stdout,
          stderr = _ref3.stderr;
      var lines = stdout.split('\n');
      var file = lines[lines.length - 1];

      if (file.indexOf('neon-extension-') !== 0) {
        _vorpal.default.logger.error("[NeApp/".concat(name, "#").concat(branch, "] Invalid file: ").concat(file));

        return Promise.reject();
      }

      _vorpal.default.logger.info("[NeApp/".concat(name, "#").concat(branch, "] ").concat(file));

      if (stderr.length > 0) {
        _vorpal.default.logger.warn("[NeApp/".concat(name, "#").concat(branch, "] ").concat(stderr));
      }

      return file;
    }).then(function (file) {});
  }).catch(function (err) {
    _vorpal.default.logger.warn("[NeApp/".concat(name, "#").concat(branch, "] Error raised: ").concat(err.message || err));

    return Promise.reject(err);
  });
}

function installBrowser(target, branch, modules) {
  // Pack modules
  return (0, _promise.runSequential)(modules, function (name) {
    return pack(target, branch, name);
  });
}

function installModule(target, branch, modules) {
  // Link modules
  return (0, _promise.runSequential)(modules, function (name) {
    return link(target, branch, name);
  });
}

function install(target, branch) {
  return _fsExtra.default.readJson(_path.default.join(target, 'package.json')).then(function (pkg) {
    var modules = (0, _package.getPackageModules)(pkg);

    _vorpal.default.logger.info("Installing ".concat(modules.length, " module(s) to \"").concat(_path.default.relative(_process.default.cwd(), target) || ".".concat(_path.default.sep), "\"...")); // Browser


    if ((0, _browser.isBrowser)(pkg['name'])) {
      return installBrowser(target, branch, modules);
    } // Module


    return installModule(target, branch, modules);
  }).then(function () {
    return (// Install package
      _npm.default.install(target).then(_npm.default.createHandler(_vorpal.default.logger))
    );
  });
} // Command


var cmd = _vorpal.default.command('travis:install <branch>', 'Install travis environment.').option('--target <target>', 'Target package [default: ./]'); // Action


cmd.action(function (_ref4) {
  var branch = _ref4.branch,
      options = _ref4.options;

  var target = _path.default.resolve(options.target || _process.default.cwd()); // Run task


  return install(target, branch).catch(function (err) {
    _vorpal.default.logger.error(err.stack || err.message || err);

    _process.default.exit(1);
  });
});