"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createRelease = createRelease;
exports.updatePackageRelease = updatePackageRelease;

var _chalk = _interopRequireDefault(require("chalk"));

var _child_process = _interopRequireDefault(require("child_process"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _path = _interopRequireDefault(require("path"));

var _remove = _interopRequireDefault(require("lodash/remove"));

var _semver = _interopRequireDefault(require("semver"));

var _sublime = require("open-in-editor/lib/editors/sublime");

var _github = require("../../../core/github");

var _promise = require("../../../core/helpers/promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var Editor = (0, _sublime.detect)();
var GroupTitleRegex = /(Added|Changed|Fixed)\n/g;
var NotesRegex = /(((Added|Changed|Fixed)\n( - .*\n)+\n?)+)/;

function extractReleaseNotes(message) {
  message = message.replace(/\r\n/g, '\n'); // Find release notes

  var notes = NotesRegex.exec(message);

  if ((0, _isNil.default)(notes)) {
    throw new Error("Unable to find release notes for ".concat(module.name));
  }

  return notes[0];
}

function getReleaseNotes(module, tag) {
  return _github.GithubApi.repos.getReleaseByTag({
    owner: 'NeApp',
    repo: module.name,
    tag: tag
  }).then(function (_ref) {
    var data = _ref.data;
    return "### [".concat(module.name, "](https://github.com/NeApp/").concat(module.name, "/releases/tag/").concat(tag, ")\n\n") + "".concat(data.body);
  }, function () {
    return null;
  });
}

function getReleaseNotesForModules(modules, tag) {
  return (0, _promise.runSequential)(modules, function (module) {
    return getReleaseNotes(module, tag);
  });
}

function openEditor(module, notes) {
  var path = _path.default.join(module.path, 'TAG_MESSAGE'); // Write release notes to path


  return _fsExtra.default.writeFile(path, notes) // Detect editor path
  .then(function () {
    return Editor;
  }) // Open editor (to allow for the editing of release notes)
  .then(function (cmd) {
    return new Promise(function (resolve, reject) {
      _child_process.default.exec("\"".concat(cmd, "\" --wait \"").concat(path, "\""), function (err) {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }) // Read release notes from path
  .then(function () {
    return _fsExtra.default.readFile(path, {
      encoding: 'utf8'
    });
  });
}

function createRelease(log, module, repository, tag) {
  return _github.GithubApi.repos.getReleaseByTag({
    owner: 'NeApp',
    repo: module.name,
    tag: tag
  }).catch(function () {
    return null;
  }).then(function (result) {
    if (!(0, _isNil.default)(result)) {
      log.debug("[".concat(module.name, "] Release already exists for \"").concat(tag, "\""));
      return Promise.resolve();
    } // Retrieve tag message


    return repository.tag(['-l', '--format="%(contents)"', tag]) // Extract release notes from tag message
    .then(function (message) {
      var notes = extractReleaseNotes(message); // Update group titles

      return notes.replace(GroupTitleRegex, '**$1**\n\n');
    }) // Open editor (to allow the editing of release notes)
    .then(function (notes) {
      return openEditor(module, notes);
    }) // Create release
    .then(function (notes) {
      return _github.GithubApi.repos.createRelease({
        'owner': 'NeApp',
        'repo': module.name,
        'tag_name': tag,
        'target_commitish': tag,
        'prerelease': !(0, _isNil.default)(_semver.default.prerelease(tag)),
        'name': tag,
        'body': notes
      }).then(function () {
        log.info(_chalk.default.green("[".concat(module.name, "] Created release: ").concat(tag)));
      });
    });
  });
}

function updatePackageRelease(log, extension, repository, modules, tag) {
  return _github.GithubApi.repos.getReleaseByTag({
    owner: 'NeApp',
    repo: extension.name,
    tag: tag
  }).then(function (_ref2) {
    var data = _ref2.data;
    // Retrieve tag message
    return repository.tag(['-l', '--format="%(contents)"', tag]) // Extract release notes from tag message
    .then(function (message) {
      return extractReleaseNotes(message).replace(GroupTitleRegex, '**$1**\n\n');
    }) // Retrieve release notes for modules
    .then(function (notes) {
      return getReleaseNotesForModules(modules).then(function (moduleNotes) {
        (0, _remove.default)(moduleNotes, _isNil.default);
        return notes.concat.apply(notes, _toConsumableArray(moduleNotes));
      });
    }) // Open editor (to allow the editing of release notes)
    .then(function (notes) {
      return openEditor(extension, notes);
    }) // Update release notes
    .then(function (notes) {
      return _github.GithubApi.repos.editRelease({
        'id': data.id,
        'owner': 'NeApp',
        'repo': module.name,
        'tag_name': tag,
        'target_commitish': tag,
        'prerelease': !(0, _isNil.default)(_semver.default.prerelease(tag)),
        'name': tag,
        'body': notes
      }).then(function () {
        log.info(_chalk.default.green("[".concat(extension.name, "] Created release: ").concat(tag)));
      });
    });
  }, function (err) {
    var details;

    try {
      details = JSON.parse(err);
    } catch (e) {
      log.debug("[".concat(extension.name, "] Unable to parse error details: ").concat(e));
      return Promise.reject(new Error("Unable to retrieve release notes for \"".concat(tag, "\" on \"").concat(extension.name, "\"")));
    }

    return Promise.reject(new Error("Unable to retrieve release notes for \"".concat(tag, "\" on \"").concat(extension.name, "\": ").concat(details.message)));
  });
}