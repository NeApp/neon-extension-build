"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exists = exists;
exports.isAuthenticated = isAuthenticated;
exports["default"] = exports.GithubApi = void 0;

var _https = _interopRequireDefault(require("https"));

var _rest = _interopRequireDefault(require("@octokit/rest"));

var _process = _interopRequireDefault(require("process"));

var _vorpal = _interopRequireDefault(require("./vorpal"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var GithubApi = (0, _rest["default"])();
exports.GithubApi = GithubApi;

if (_process["default"].env['GITHUB_TOKEN']) {
  GithubApi.authenticate({
    type: 'token',
    token: _process["default"].env['GITHUB_TOKEN']
  });
}

function exists(name, branch) {
  return new Promise(function (resolve, reject) {
    var req = _https["default"].request({
      method: 'HEAD',
      protocol: 'https:',
      hostname: 'github.com',
      port: 443,
      path: "/RadonApp/".concat(name, "/tree/").concat(branch)
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

function isAuthenticated() {
  return GithubApi.orgs.get({
    org: 'RadonApp'
  }).then(function (_ref) {
    var headers = _ref.headers;

    if ((0, _isNil["default"])(headers['x-oauth-scopes'])) {
      return Promise.reject(new Error('GitHub: No authentication token provided'));
    }

    if (headers['x-oauth-scopes'].indexOf('repo') < 0) {
      return Promise.reject(new Error('GitHub: No "repo" access'));
    }

    return true;
  }, function (err) {
    if ((0, _isNil["default"])(err) || (0, _isNil["default"])(err.code)) {
      return Promise.reject(new Error("GitHub: ".concat(err.message || err)));
    } // Return API Error


    try {
      var data = JSON.parse(err.message);

      if (!(0, _isNil["default"])(data.message) && data.message.length > 0) {
        return Promise.reject(new Error("GitHub: ".concat(data.message)));
      }
    } catch (e) {
      _vorpal["default"].logger.debug("Unable to parse error: ".concat(err.message));
    }

    return Promise.reject(new Error("GitHub: ".concat(err.message || err)));
  });
}

var _default = {
  exists: exists,
  isAuthenticated: isAuthenticated
};
exports["default"] = _default;