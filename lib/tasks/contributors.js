"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.writeContributors = writeContributors;
exports["default"] = exports.Contributors = void 0;

var _keyBy = _interopRequireDefault(require("lodash/keyBy"));

var _map = _interopRequireDefault(require("lodash/map"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _path = _interopRequireDefault(require("path"));

var _sortBy = _interopRequireDefault(require("lodash/sortBy"));

var _git = _interopRequireDefault(require("../core/git"));

var _json = _interopRequireDefault(require("../core/json"));

var _helpers = require("../core/helpers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function resolveContributors(path, existing) {
  return _git["default"].contributors(path).then(function (current) {
    return (0, _sortBy["default"])(Object.values((0, _merge["default"])((0, _keyBy["default"])(existing, 'name'), (0, _keyBy["default"])(current, 'name'))), 'commits');
  });
}

function writeContributors(repository, path) {
  var contributorsPath = _path["default"].join(path, 'contributors.json'); // Read existing contributors from file


  return _json["default"].read(contributorsPath) // Update contributors with current repository commits
  .then(function (existing) {
    return resolveContributors(path, existing || []);
  }) // Write contributors to file
  .then(function (contributors) {
    return _json["default"].write(contributorsPath, contributors, {
      spaces: 2
    });
  });
}

function updatePackage(path) {
  return _git["default"].status(path).then(function (repository) {
    return writeContributors(repository, path);
  });
}

function updateModules(modules) {
  return Promise.all((0, _map["default"])(modules, function (module) {
    return writeContributors(module.repository, module.path);
  }));
}

var Contributors = _helpers.Task.create({
  name: 'contributors:update',
  description: 'Update module contributors.'
}, function (log, browser, environment) {
  // Update contributors
  return Promise.all([updatePackage(environment.builderPath), updateModules(browser.modules)]);
});

exports.Contributors = Contributors;
var _default = Contributors;
exports["default"] = _default;