"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.CreateRelease = exports.ReleaseFiles = void 0;

var _chalk = _interopRequireDefault(require("chalk"));

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _map = _interopRequireDefault(require("lodash/map"));

var _mapValues = _interopRequireDefault(require("lodash/mapValues"));

var _omitBy = _interopRequireDefault(require("lodash/omitBy"));

var _path = _interopRequireDefault(require("path"));

var _semver = _interopRequireDefault(require("semver"));

var _promise = _interopRequireDefault(require("simple-git/promise"));

var _git = _interopRequireDefault(require("../../core/git"));

var _helpers = require("../../core/helpers");

var _helpers2 = require("./core/helpers");

var _promise2 = require("../../core/helpers/promise");

var _contributors = require("../contributors");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

var ReleaseFiles = ['contributors.json', 'package.json'];
exports.ReleaseFiles = ReleaseFiles;

function isPatchRelease(current, next) {
  return (// Major + Minor
    _semver.default.major(current) === _semver.default.major(next) && _semver.default.minor(current) === _semver.default.minor(next) && // Pre-release
    (0, _isNil.default)(_semver.default.prerelease(current)) === (0, _isNil.default)(_semver.default.prerelease(next))
  );
}

function createReleases(log, browser, version, options) {
  log.debug('Creating releases...'); // Create releases for each module with changes

  return (0, _promise2.runSequential)((0, _helpers2.getPackages)(browser), function (module) {
    var repository = (0, _promise.default)(module.path).silent(true);
    return repository.status().then(function (status) {
      if (status.files.length < 1 && !options.force) {
        return Promise.resolve();
      } // Create release


      return Promise.resolve() // Commit changes
      .then(function () {
        log.debug("[".concat(module.name, "] Committing changes: ").concat(ReleaseFiles.join(', '))); // Commit changes to repository

        return repository.commit("Bumped version to ".concat(version), ReleaseFiles).then(function (summary) {
          log.info(_chalk.default.green("[".concat(module.name, "] Committed changes (").concat(summary.commit, ")")));
        });
      }) // Retrieve commits since the latest version
      .then(function () {
        return repository.raw(['describe', '--abbrev=0', '--match=v*', '--tags']).then(function (latestTag) {
          return repository.log({
            from: latestTag.trim(),
            to: 'HEAD^'
          });
        });
      }) // Write tag message to file
      .then(function (commits) {
        var lines = ["Release ".concat(version, "\n"), // Release notes
        '# Added', '#  - ', '#', '# Changed', '#  - ', '#', '# Fixed', '#  - ', '#', // Commits since the previous release
        '# Commits:']; // Append commits

        lines = lines.concat((0, _map.default)(commits.all, function (commit) {
          return "# (".concat(commit.date, ") [").concat(commit.hash.substring(0, 7), "] ").concat(commit.message);
        })); // Write to temporary file

        return _fsExtra.default.writeFile(_path.default.join(module.path, 'TAG_MESSAGE'), lines.join('\n'));
      }) // Create tag
      .then(function () {
        log.debug("[".concat(module.name, "] Creating tag: v").concat(version)); // Create tag in repository

        return repository.tag(['-a', '-s', '-e', '-F', _path.default.join(module.path, 'TAG_MESSAGE'), "v".concat(version)]).then(function () {
          log.info(_chalk.default.green("[".concat(module.name, "] Created tag: v").concat(version)));
        });
      });
    });
  });
}

function updateContributors(log, browser, options) {
  log.debug('Updating contributors...'); // Update contributors for each module with changes

  return (0, _promise2.runSequential)((0, _helpers2.getPackages)(browser), function (module) {
    // Retrieve module repository status
    return _git.default.status(module.path).then(function (repository) {
      if (!repository.dirty && !options.force) {
        return Promise.resolve();
      } // Update module contributors


      return (0, _contributors.writeContributors)(repository, module.path).then(function () {
        log.info(_chalk.default.green("[".concat(module.name, "] Updated contributors")));
      });
    });
  });
}

function updatePackageDependenciesGroup(group, versions, pkg) {
  if ((0, _isNil.default)(pkg[group])) {
    return false;
  } // Remove empty dependencies


  if (Object.keys(pkg[group]).length < 1) {
    delete pkg[group];
    return false;
  } // Update dependencies


  var changed = false;
  pkg[group] = (0, _mapValues.default)(pkg[group], function (version, name) {
    if (name.indexOf('neon-extension-') < 0) {
      return version;
    }

    if ((0, _isNil.default)(versions[name])) {
      throw new Error("Unknown dependency: ".concat(name));
    } // Retrieve current version


    var current = versions[name];

    if (group === 'peerDependencies') {
      var satisfied = _semver.default.satisfies(versions[name], current);

      current = "^".concat(versions[name]);

      if (satisfied) {
        return current;
      }
    } // Ensure version has changed


    if (current === version) {
      return current;
    } // Mark dependency group as changed


    changed = true; // Update version

    return current;
  });
  return changed;
}

function updatePackageDependencies(versions, pkg) {
  var changed = false; // Update each dependency group

  ['dependencies', 'devDependencies', 'peerDependencies'].forEach(function (group) {
    changed = updatePackageDependenciesGroup(group, versions, pkg) || changed;
  });
  return changed;
}

function updatePackages(log, browser, version, options) {
  var versions = {};
  log.debug('Updating packages...'); // Update package metadata for each module

  return (0, _promise2.runSequential)((0, _helpers2.getPackages)(browser), function (module) {
    var pkg = (0, _cloneDeep.default)(module.package); // Ensure package metadata exists

    if ((0, _isNil.default)(pkg)) {
      if (!options.force) {
        return Promise.reject(_chalk.default.red("Unable to create release, ".concat(module.name, " has no package metadata")));
      } // Display warning


      log.warn(_chalk.default.yellow("[".concat(module.name, "] Module has no package metadata"))); // Ignore module

      return Promise.resolve();
    } // Ensure the repository isn't dirty


    if (module.repository.dirty) {
      if (!options.force) {
        return Promise.reject(_chalk.default.red("Unable to create release, ".concat(module.name, " has uncommitted changes")));
      } // Display warning


      log.warn(_chalk.default.yellow("[".concat(module.name, "] Repository has uncommitted changes")));
    } // Update dependencies


    var dependenciesChanged = updatePackageDependencies(versions, pkg);

    if (dependenciesChanged) {
      log.debug("[".concat(module.name, "] Dependencies changed"));
    } // Only create patch releases on modules with changes


    if (dependenciesChanged || module.repository.ahead > 0 || !isPatchRelease(pkg.version, version)) {
      // Ensure version has been incremented
      if (_semver.default.lte(version, pkg.version)) {
        if (!options.force) {
          return Promise.reject(_chalk.default.red("Unable to create release, target version (".concat(version, ") should be later than the current ") + "".concat(module.name, " version: ").concat(pkg.version)));
        } // Display warning


        log.warn(_chalk.default.yellow("[".concat(module.name, "] Target version (").concat(version, ") should be later than the ") + "current version: ".concat(pkg.version)));
      }

      log.info(_chalk.default.green("[".concat(module.name, "] Version changed to: ").concat(version))); // Update version

      pkg.version = version; // Store module version

      versions[module.name] = version;
    } else {
      log.debug("[".concat(module.name, "] Version: ").concat(pkg.version)); // Store module version

      versions[module.name] = pkg.version;
      return Promise.resolve();
    } // Read package metadata from file (to determine the current EOL character)


    var path = _path.default.join(module.path, 'package.json');

    return _fsExtra.default.readFile(path).then(function (data) {
      return (// Write package metadata to file
        _fsExtra.default.writeJson(path, (0, _omitBy.default)(pkg, _isNil.default), {
          EOL: data.indexOf('\r\n') >= 0 ? '\r\n' : '\n',
          spaces: 2
        })
      );
    });
  });
}

var CreateRelease = _helpers.Task.create({
  name: 'release:create <version>',
  description: 'Create release.',
  command: function command(cmd) {
    return cmd.option('--force', 'Create release (ignoring all violations).');
  }
}, function (log, browser, environment, _ref) {
  var version = _ref.version,
      options = _objectWithoutProperties(_ref, ["version"]);

  // Ensure the provided `version` is valid
  if (version.length < 1 || version.indexOf('v') === 0 || !_semver.default.valid(version)) {
    return Promise.reject(new Error("Invalid version: ".concat(version)));
  } // Create release


  return Promise.resolve() // Update packages (set version, and update dependencies)
  .then(function () {
    return updatePackages(log, browser, version, options);
  }) // Update contributors (on updated packages)
  .then(function () {
    return updateContributors(log, browser, options);
  }) // Create releases (commit, and tag version)
  .then(function () {
    return createReleases(log, browser, version, options);
  });
}, {
  force: false,
  version: null
});

exports.CreateRelease = CreateRelease;
var _default = CreateRelease;
exports.default = _default;