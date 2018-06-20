"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.CreateRelease = exports.ReleaseFiles = void 0;

var _chalk = _interopRequireDefault(require("chalk"));

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _isEqual = _interopRequireDefault(require("lodash/isEqual"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _map = _interopRequireDefault(require("lodash/map"));

var _omitBy = _interopRequireDefault(require("lodash/omitBy"));

var _path = _interopRequireDefault(require("path"));

var _semver = _interopRequireDefault(require("semver"));

var _promise = _interopRequireDefault(require("simple-git/promise"));

var _git = _interopRequireDefault(require("../../core/git"));

var _helpers = require("../../core/helpers");

var _helpers2 = require("./core/helpers");

var _promise2 = require("../../core/helpers/promise");

var _package = require("../../core/package");

var _contributors = require("../contributors");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var ReleaseFiles = ['contributors.json', 'package.json'];
exports.ReleaseFiles = ReleaseFiles;

function isPatchRelease(current, next) {
  return (// Major + Minor
    _semver.default.major(current) === _semver.default.major(next) && _semver.default.minor(current) === _semver.default.minor(next) && // Pre-release
    (0, _isNil.default)(_semver.default.prerelease(current)) === (0, _isNil.default)(_semver.default.prerelease(next))
  );
}

function createReleases(log, browser, version, options) {
  if (options.commit) {
    log.debug('Creating releases...');
  } else {
    log.info('Creating releases... (skipped)');
    return Promise.resolve();
  } // Create releases for each module with changes


  return (0, _promise2.runSequential)((0, _helpers2.getPackages)(browser), function (module) {
    var repository = (0, _promise.default)(module.path).silent(true);
    return repository.status().then(function (status) {
      if (status.files.length < 1) {
        if (!options.force) {
          return Promise.resolve();
        } // Display warning


        log.warn(_chalk.default.yellow("[".concat(module.name, "] Repository has no changes")));
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
      if (!repository.dirty) {
        if (!options.force) {
          return Promise.resolve();
        } // Display warning


        log.warn(_chalk.default.yellow("[".concat(module.name, "] Repository has no changes")));
      } // Update module contributors


      return (0, _contributors.writeContributors)(repository, module.path).then(function () {
        log.info(_chalk.default.green("[".concat(module.name, "] Updated contributors")));
      });
    });
  });
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
    }

    function formatVersion(version, name) {
      if (module.type === 'package') {
        return "file:".concat(name, "-").concat(version, ".tgz");
      }

      return version;
    } // Update module versions in [package-lock.json]


    return (0, _package.writePackageLocks)(module.path, versions, {
      formatVersion: formatVersion
    }).then(function (dependenciesChanged) {
      // Update package dependencies
      dependenciesChanged = !(0, _isEqual.default)((0, _cloneDeep.default)(pkg), (0, _package.updatePackage)(pkg, versions, {
        formatVersion: formatVersion
      })) || dependenciesChanged;

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

        versions[module.name] = pkg.version; // No changes

        if (!options.force) {
          return Promise.resolve();
        }
      } // Write package version to [package-lock.json]


      return (0, _package.writePackageLocks)(module.path, _defineProperty({}, module.name, pkg.version)).then(function () {
        // Read package metadata from file (to determine the current EOL character)
        var path = _path.default.join(module.path, 'package.json');

        return _fsExtra.default.readFile(path).then(function (data) {
          return (// Write package metadata to file
            _fsExtra.default.writeJson(path, (0, _omitBy.default)(pkg, function (value) {
              if ((0, _isNil.default)(value)) {
                return true;
              }

              if ((0, _isPlainObject.default)(value) && Object.keys(value).length < 1) {
                return true;
              }

              return false;
            }), {
              EOL: data.indexOf('\r\n') >= 0 ? '\r\n' : '\n',
              spaces: 2
            })
          );
        });
      });
    });
  });
}

var CreateRelease = _helpers.Task.create({
  name: 'release:create <version>',
  description: 'Create release.',
  command: function command(cmd) {
    return cmd.option('--force', 'Create release (ignoring all violations).').option('--no-commit', 'Do not commit changes');
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