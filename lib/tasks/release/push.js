"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.PushRelease = void 0;

var _chalk = _interopRequireDefault(require("chalk"));

var _find = _interopRequireDefault(require("lodash/find"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isString = _interopRequireDefault(require("lodash/isString"));

var _semver = _interopRequireDefault(require("semver"));

var _promise = _interopRequireDefault(require("simple-git/promise"));

var _travisCi = _interopRequireDefault(require("travis-ci"));

var _github = require("../../core/github");

var _helpers = require("../../core/helpers");

var _release = require("./core/release");

var _helpers2 = require("./core/helpers");

var _promise2 = require("../../core/helpers/promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Remotes = ['bitbucket/neapp', 'neapp'];
var travis = new _travisCi.default({
  version: '2.0.0'
});

function getTargetBranches(tag) {
  return [// Development
  'develop', // Version
  /v\d+\.\d+/.exec(tag)[0], // Pre-release
  'master'];
}

function getTravisStatus(log, module, ref, options) {
  options = _objectSpread({
    createdAfter: null,
    sha: null,
    delay: 5 * 1000,
    retryAttempts: 6,
    retryInterval: 10 * 1000
  }, options || {});
  return new Promise(function (resolve, reject) {
    var attempts = 0;

    function run() {
      attempts++; // Stop retrying after the maximum attempts have been reached

      if (attempts > options.retryAttempts) {
        reject(new Error("Unable to retrieve the travis status for \"".concat(ref, "\" on ").concat(module.name)));
        return;
      }

      log.debug("[".concat(module.name, "] (GitHub) Fetching the status of \"").concat(ref, "\"...")); // Retrieve combined status for `ref`

      _github.GithubApi.repos.getCombinedStatusForRef({
        owner: 'NeApp',
        repo: module.name,
        ref: ref
      }).then(function (_ref) {
        var _ref$data = _ref.data,
            sha = _ref$data.sha,
            statuses = _ref$data.statuses;

        // Ensure status `sha` matches the provided `sha`
        if (!(0, _isNil.default)(options.sha) && sha !== options.sha) {
          setTimeout(run, options.retryInterval);
          return;
        } // Find travis status


        var travis = (0, _find.default)(statuses, {
          context: 'continuous-integration/travis-ci/push'
        });

        if ((0, _isNil.default)(travis)) {
          setTimeout(run, options.retryInterval);
          return;
        } // Ensure travis status was created after the provided timestamp


        if (!(0, _isNil.default)(options.createdAfter) && Date.parse(travis['created_at']) < options.createdAfter) {
          setTimeout(run, options.retryInterval);
          return;
        } // Resolve with travis status


        resolve(travis);
      });
    }

    log.debug("[".concat(module.name, "] Waiting ").concat(Math.round(options.delay / 1000), " seconds..."));
    setTimeout(run, options.delay);
  });
}

function awaitTravisBuild(log, module, ref, id, options) {
  options = _objectSpread({
    retryAttempts: 40,
    retryInterval: 15 * 1000
  }, options || {});
  return new Promise(function (resolve, reject) {
    var attempts = 0;

    function run() {
      attempts++;

      if (attempts === 2) {
        log.info("[".concat(module.name, "] Building \"").concat(ref, "\" on Travis CI... (2 ~ 5 minutes)"));
      } // Stop retrying after the maximum attempts have been reached


      if (attempts > options.retryAttempts) {
        reject(new Error("Build timeout for \"".concat(id, "\"")));
        return;
      }

      log.debug("[".concat(module.name, "] (Travis CI) Fetching the state of build ").concat(id, "...")); // Retrieve build details for `id`

      travis.builds(id).get(function (err, res) {
        if (err) {
          reject(err);
          return;
        }

        var build = res.build,
            commit = res.commit; // Ensure the correct build was returned

        if (commit['branch'] !== ref) {
          reject(new Error("Incorrect build selected (expected: ".concat(ref, ", found: ").concat(commit['branch'], ")")));
          return;
        }

        log.debug("[".concat(module.name, "] (Travis CI) State: ").concat(build['state'])); // Ensure build has finished

        if (['created', 'started'].indexOf(build['state']) >= 0) {
          setTimeout(run, options.retryInterval);
          return;
        } // Resolve with final state


        resolve(build['state']);
      });
    }

    run();
  });
}

function awaitBuild(log, module, ref, options) {
  // Retrieve travis status for `ref`
  return getTravisStatus(log, module, ref, options).then(function (status) {
    var parameters = /https:\/\/travis-ci\.org\/.*?\/.*?\/builds\/(\d+)/.exec(status['target_url']); // Ensure parameters are valid

    if ((0, _isNil.default)(parameters) || parameters.length !== 2) {
      return Promise.reject(new Error("Unknown travis status \"target_url\": \"".concat(status['target_url'], "\"")));
    } // Await travis build to complete


    return awaitTravisBuild(log, module, ref, parameters[1]);
  });
}

function pushBranches(log, module, repository, remotes, commit, tag) {
  var branches = getTargetBranches(tag); // Push each branch to remote(s), and await build to complete

  return (0, _promise2.runSequential)(branches, function (branch) {
    var startedAt = null;
    return (0, _promise2.runSequential)(remotes, function (remote) {
      // Retrieve current remote commit (from local)
      return repository.revparse("".concat(remote, "/").concat(branch)).catch(function () {
        return null;
      }).then(function (currentCommit) {
        if (!(0, _isNil.default)(currentCommit) && currentCommit.trim() === commit) {
          log.debug("[".concat(module.name, "] ").concat(tag, " has already been pushed to \"").concat(branch, "\" on \"").concat(remote, "\""));
          return Promise.resolve();
        }

        log.debug("[".concat(module.name, "] Pushing ").concat(tag, " to \"").concat(branch, "\" on \"").concat(remote, "\""));

        if (remote === 'neapp') {
          startedAt = Date.now();
        } // Push branch to remote


        return repository.push(remote, "+".concat(tag, "~0:refs/heads/").concat(branch));
      });
    }).then(function () {
      if ((0, _isNil.default)(startedAt) || remotes.indexOf('neapp') < 0) {
        return Promise.resolve();
      } // Wait for build to complete


      return awaitBuild(log, module, branch, {
        sha: commit,
        createdAfter: startedAt
      }).then(function (state) {
        if (state === 'failure') {
          return Promise.reject(new Error("Build failed for ".concat(module.name, "#").concat(branch)));
        } // Build successful


        return Promise.resolve();
      });
    });
  });
}

function pushTag(log, module, repository, remotes, commit, tag) {
  // Push tag to remote
  return (0, _promise2.runSequential)(remotes, function (remote) {
    log.debug("[".concat(module.name, "] Pushing ").concat(tag, " tag to \"").concat(remote, "\"")); // Push tag to remote

    return repository.push(remote, "refs/tags/".concat(tag));
  }).then(function () {
    if (remotes.indexOf('neapp') < 0) {
      return Promise.resolve();
    } // Wait for build to complete


    return awaitBuild(log, module, tag, {
      sha: commit,
      // Wait 15s before the first status request (hopefully enough time for the status to be updated)
      delay: 15 * 1000
    }).then(function (state) {
      if (state === 'failure') {
        return Promise.reject(new Error("Build failed for ".concat(module.name, "#").concat(tag)));
      } // Create release on GitHub


      if (module.type !== 'package') {
        return (0, _release.createRelease)(log, module, repository, tag);
      }

      return Promise.resolve();
    });
  });
}

function pushRelease(log, browser, remotes) {
  if ((0, _isString.default)(remotes)) {
    remotes = [remotes];
  } else if ((0, _isNil.default)(remotes)) {
    remotes = Remotes;
  } else if (!Array.isArray(remotes)) {
    return Promise.reject("Invalid remotes: ".concat(remotes));
  }

  var repository = (0, _promise.default)(browser.extension.path).silent(true);
  var modules = (0, _helpers2.getPackages)(browser);
  var pushed = {}; // Retrieve current version

  return repository.raw(['describe', '--abbrev=0', '--match=v*', '--tags', '--exact-match']).then(function (tag) {
    tag = tag.trim(); // Validate version

    if (tag.length < 1 || tag.indexOf('v') !== 0 || !_semver.default.valid(tag)) {
      return Promise.reject(new Error("Unable to push release, ".concat(browser.extension.name, " has an invalid version tag: ").concat(tag)));
    } // Push release for each module


    return (0, _promise2.runSequential)(modules, function (module) {
      var moduleRepository = (0, _promise.default)(module.path).silent(true); // Retrieve current version

      return moduleRepository.raw(['describe', '--abbrev=0', '--match=v*', '--tags', '--exact-match']).then(function (moduleTag) {
        moduleTag = moduleTag.trim(); // Ignore modules with no release matching the `tag`

        if (moduleTag !== tag) {
          return Promise.resolve();
        } // Resolve version commit sha


        return moduleRepository.revparse("".concat(tag, "~0")).then(function (commit) {
          commit = commit.trim();
          log.debug("[".concat(module.name, "] Pushing ").concat(tag, " (").concat(commit, ") to remotes: ").concat(remotes.join(', '))); // Push release to remote(s)

          return Promise.resolve() // Push branches to remote(s)
          .then(function () {
            return pushBranches(log, module, moduleRepository, remotes, commit, tag);
          }) // Push tag to remote(s)
          .then(function () {
            return pushTag(log, module, moduleRepository, remotes, commit, tag);
          }) // Log result
          .then(function () {
            log.info(_chalk.default.green("[".concat(module.name, "] Pushed ").concat(tag, " to: ").concat(remotes.join(', ')))); // Mark module as pushed

            pushed[module.name] = true;
          });
        });
      }, function () {
        log.debug("[".concat(module.name, "] No release available to push"));
      });
    }).then(function () {
      if (pushed[browser.extension.name] !== true) {
        log.debug("[".concat(browser.extension.name, "] No release pushed, ignoring the generation of release notes"));
        return Promise.resolve();
      } // Update package release


      return (0, _release.updatePackageRelease)(log, browser.extension, repository, modules, tag);
    });
  });
}

var PushRelease = _helpers.Task.create({
  name: 'release:push',
  description: 'Push release to remote(s).',
  command: function command(cmd) {
    return cmd.option('--remote <remote>', 'Remote [default: all]', Remotes);
  }
}, function (log, browser, environment, _ref2) {
  var remote = _ref2.remote;
  return pushRelease(log, browser, remote);
}, {
  remote: null
});

exports.PushRelease = PushRelease;
var _default = PushRelease;
exports.default = _default;