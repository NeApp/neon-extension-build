"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exists = exists;
exports.default = exports.GithubApi = void 0;

var _https = _interopRequireDefault(require("https"));

var _rest = _interopRequireDefault(require("@octokit/rest"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var GithubApi = (0, _rest.default)();
exports.GithubApi = GithubApi;

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

var _default = {
  exists: exists
};
exports.default = _default;