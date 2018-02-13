"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Git = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _path = _interopRequireDefault(require("path"));

var _simpleGit = _interopRequireDefault(require("simple-git"));

var _sortBy = _interopRequireDefault(require("lodash/sortBy"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Git =
/*#__PURE__*/
function () {
  function Git() {
    _classCallCheck(this, Git);
  }

  _createClass(Git, [{
    key: "contributors",
    value: function contributors(path) {
      var repository = (0, _simpleGit.default)(path).silent(true); // Retrieve repository commits

      return this._getCommits(repository).then(function (commits) {
        var contributorsMap = {};

        for (var i = 0; i < commits.all.length; i++) {
          var commit = commits.all[i];

          if ((0, _isNil.default)(contributorsMap[commit.author_email])) {
            // Create contributor
            contributorsMap[commit.author_email] = {
              name: commit.author_name,
              email: commit.author_email,
              commits: 0
            };
          } // Update contributor commit count


          contributorsMap[commit.author_email].commits += 1;
        } // Sort contributors by commit count


        return (0, _sortBy.default)(Object.values(contributorsMap), 'commits');
      });
    }
  }, {
    key: "status",
    value: function status(path) {
      var _this = this;

      // Ensure repository exists
      if (!_fs.default.existsSync(_path.default.join(path, '.git'))) {
        return Promise.resolve({});
      } // Create repository instance


      var repository = (0, _simpleGit.default)(path).silent(true); // Retrieve repository status

      return Promise.resolve() // Retrieve latest version
      .then(function () {
        return _this._getCurrentTag(repository).then(function (tag) {
          return {
            tag: tag
          };
        }, function () {
          return {
            tag: null
          };
        });
      }) // Retrieve commits since latest version
      .then(function (result) {
        return _this._getCommits(repository, result.tag).then(function (commits) {
          return _extends({}, result, {
            ahead: commits.total
          });
        }, function () {
          return _extends({}, result, {
            ahead: 0
          });
        });
      }) // Retrieve latest commit hash
      .then(function (result) {
        return _this._resolveHash(repository).then(function (commit) {
          return _extends({}, result, {
            commit: commit
          });
        }, function () {
          return _extends({}, result, {
            commit: null
          });
        });
      }) // Retrieve status
      .then(function (result) {
        return _this._getStatus(repository).then(function (status) {
          return _extends({}, result, {
            branch: status.current,
            dirty: status.files.length > 0
          });
        }, function () {
          return _extends({}, result, {
            branch: null,
            dirty: false
          });
        });
      });
    }
  }, {
    key: "_getCommits",
    value: function _getCommits(repository) {
      var from = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var to = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'HEAD';
      return new Promise(function (resolve, reject) {
        repository.log({
          from: from,
          to: to
        }, function (err, commits) {
          if (err) {
            reject(err);
            return;
          }

          resolve(commits);
        });
      });
    }
  }, {
    key: "_getCurrentTag",
    value: function _getCurrentTag(repository) {
      return new Promise(function (resolve, reject) {
        repository.raw(['describe', '--exact-match', '--abbrev=0', '--match=v*', '--tags'], function (err, description) {
          if (err) {
            reject(err);
            return;
          }

          resolve(description.trim());
        });
      });
    }
  }, {
    key: "_getStatus",
    value: function _getStatus(repository) {
      return new Promise(function (resolve, reject) {
        repository.status(function (err, status) {
          if (err) {
            reject(err);
            return;
          }

          resolve(status);
        });
      });
    }
  }, {
    key: "_resolveHash",
    value: function _resolveHash(repository) {
      var name = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'HEAD';
      return new Promise(function (resolve, reject) {
        repository.revparse([name], function (err, hash) {
          if (err) {
            reject(err);
            return;
          }

          resolve(hash.trim());
        });
      });
    }
  }]);

  return Git;
}();

exports.Git = Git;

var _default = new Git();

exports.default = _default;