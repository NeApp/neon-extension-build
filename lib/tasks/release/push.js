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

var _github = require("../../core/github");

var _helpers = require("../../core/helpers");

var _helpers2 = require("./core/helpers");

var _promise2 = require("../../core/helpers/promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getTargetBranches(tag) {
  return [// Development
  'develop', // Version
  /v\d+\.\d+/.exec(tag)[0], // Pre-release
  'master'];
}

function hasTravisStatus(statuses) {
  return !(0, _isNil.default)((0, _find.default)(statuses, {
    context: 'continuous-integration/travis-ci/push'
  }));
}

function awaitBuild(log, module, ref, commit) {
  return new Promise(function (resolve, reject) {
    var attempts = 0;

    function next() {
      attempts++; // Retrieve status for `ref`

      _github.GithubApi.repos.getCombinedStatusForRef({
        owner: 'NeApp',
        repo: module.name,
        ref: ref
      }).then(function (_ref) {
        var data = _ref.data;

        if (data.sha === commit && hasTravisStatus(data.statuses) && data.state !== 'pending') {
          resolve(data);
          return;
        }

        if (data.sha !== commit) {
          if (attempts > 6) {
            reject(new Error("Commit doesn't exist for ".concat(module.name, " (after 1m)")));
            return;
          }

          log.debug("[".concat(module.name, "] Commit doesn't exist, found: ").concat(data.sha));
        } else if (!hasTravisStatus(data.statuses)) {
          if (attempts > 12) {
            reject(new Error("Build wasn't created for ".concat(module.name, " (after 2m)")));
            return;
          }

          log.debug("[".concat(module.name, "] Waiting for build to be created..."));
        } else if (data.state === 'pending') {
          if (attempts > 60) {
            reject(new Error("Build timeout for ".concat(module.name, " (after 10m)")));
            return;
          }

          log.debug("[".concat(module.name, "] Waiting for build to complete..."));
        } // Retry in 10 seconds


        setTimeout(next, 10 * 1000);
      });
    }

    log.info("[".concat(module.name, "] Building on Travis CI... (2 ~ 5 minutes)"));
    next();
  });
}

function pushBranches(log, module, repository, remotes, commit, tag) {
  var branches = getTargetBranches(tag); // Push each branch to remote(s), and await build to complete

  return (0, _promise2.runSequential)(branches, function (branch) {
    return (0, _promise2.runSequential)(remotes, function (remote) {
      log.debug("[".concat(module.name, "] Pushing ").concat(tag, " to \"").concat(branch, "\" on \"").concat(remote, "\"")); // Push branch to remote

      return repository.push(remote, "".concat(tag, ":").concat(branch));
    }).then(function () {
      if (remotes.indexOf('neapp') < 0) {
        return Promise.resolve();
      } // Wait for build to complete


      return awaitBuild(log, module, branch, commit).then(function (_ref2) {
        var state = _ref2.state;

        if (state === 'failure') {
          return Promise.reject(new Error("Build failed for ".concat(module.name, "#").concat(branch)));
        } // Build successful


        return Promise.resolve();
      });
    });
  });
}

function pushTag(log, module, repository, remotes, commit, tag) {
  return (0, _promise2.runSequential)(remotes, function (remote) {
    log.debug("[".concat(module.name, "] Pushing ").concat(tag, " tag to \"").concat(remote, "\"")); // Push tag to remote

    return repository.push(remote, "refs/tags/".concat(tag));
  }).then(function () {
    if (remotes.indexOf('neapp') < 0) {
      return Promise.resolve();
    } // Wait for build to complete


    return awaitBuild(log, module, tag, commit).then(function (_ref3) {
      var state = _ref3.state;

      if (state === 'failure') {
        return Promise.reject(new Error("Build failed for ".concat(module.name, "#").concat(tag)));
      } // Build successful


      return Promise.resolve();
    });
  });
}

function pushRelease(log, browser, remotes) {
  if ((0, _isString.default)(remotes)) {
    remotes = [remotes];
  } else if ((0, _isNil.default)(remotes)) {
    remotes = ['bitbucket/neapp', 'neapp'];
  } else {
    return Promise.reject("Invalid remote: ".concat(remotes));
  }

  return (0, _promise2.runSequential)((0, _helpers2.getPackages)(browser), function (module) {
    var repository = (0, _promise.default)(module.path).silent(true);
    log.debug("[".concat(module.name, "] Pushing to remotes: ").concat(remotes.join(', '))); // Retrieve current version

    return repository.raw(['describe', '--abbrev=0', '--match=v*', '--tags', '--exact-match']).then(function (tag) {
      tag = tag.trim(); // Validate version

      if (tag.length < 1 || tag.indexOf('v') !== 0 || !_semver.default.valid(tag)) {
        return Promise.reject(new Error("Unable to push release, ".concat(module.name, " has an invalid version tag: ").concat(tag)));
      } // Resolve version commit sha


      return repository.revparse(tag).then(function (commit) {
        log.debug("[".concat(module.name, "] Pushing ").concat(tag, " (").concat(commit, ") to remotes: ").concat(remotes.join(', '))); // Push release to remote(s)

        return Promise.resolve() // Push branches to remote(s)
        .then(function () {
          return pushBranches(log, module, repository, remotes, commit, tag);
        }) // Push tag to remote(s)
        .then(function () {
          return pushTag(log, module, repository, remotes, commit, tag);
        }) // Log result
        .then(function () {
          log.info(_chalk.default.green("[".concat(module.name, "] Pushed ").concat(tag, " to: ").concat(remotes.join(', '))));
        });
      });
    }, function () {
      log.debug("[".concat(module.name, "] No release available to push"));
    });
  });
}

var PushRelease = _helpers.Task.create({
  name: 'release:push [remote]',
  description: 'Push release to remote(s).'
}, function (log, browser, environment, _ref4) {
  var remote = _ref4.remote;
  return pushRelease(log, browser, remote);
}, {
  remote: null
});

exports.PushRelease = PushRelease;
var _default = PushRelease;
exports.default = _default;