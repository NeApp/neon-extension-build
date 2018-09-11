"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createRelease = createRelease;
exports.updatePackageRelease = updatePackageRelease;

var _chalk = _interopRequireDefault(require("chalk"));

var _child_process = _interopRequireDefault(require("child_process"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _find = _interopRequireDefault(require("lodash/find"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _path = _interopRequireDefault(require("path"));

var _remove = _interopRequireDefault(require("lodash/remove"));

var _semver = _interopRequireDefault(require("semver"));

var _sublime = require("open-in-editor/lib/editors/sublime");

var _github = require("../../../core/github");

var _promise = require("../../../core/helpers/promise");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Editor = (0, _sublime.detect)().catch(function () {
  return null;
});
var GroupTitleRegex = /(Added|Changed|Fixed)\n/g;
var NotesRegex = /(((Added|Changed|Fixed)\n(\s*-\s.*\n)+\n*)+)/;

function extractReleaseNotes(message) {
  message = message.replace(/\r\n/g, '\n'); // Find release notes

  var notes = NotesRegex.exec(message);

  if ((0, _isNil.default)(notes)) {
    return '';
  }

  return notes[0].trim();
}

function getReleaseNotes(module, tag) {
  return _github.GithubApi.repos.getReleaseByTag({
    owner: 'RadonApp',
    repo: "radon-extension-".concat(module.key),
    tag: tag
  }).then(function (_ref) {
    var data = _ref.data;

    if ((0, _isNil.default)(data.body)) {
      return null;
    } // Retrieve release notes


    var body = data.body.trim();

    if (body.length < 1) {
      return null;
    } // Build release notes


    return "### [".concat(module.name, "](https://github.com/RadonApp/radon-extension-").concat(module.key, "/releases/tag/").concat(tag, ")\n\n") + "".concat(body);
  }, function () {
    return null;
  });
}

function getReleaseNotesForModules(modules, tag) {
  return (0, _promise.runSequential)(modules, function (module) {
    if (module.type === 'package') {
      return Promise.resolve(null);
    }

    return getReleaseNotes(module, tag);
  });
}

function openEditor(module, notes) {
  var path = _path.default.join(module.path, 'TAG_MESSAGE'); // Write release notes to path


  return _fsExtra.default.writeFile(path, notes) // Detect editor path
  .then(function () {
    return Editor.then(function (cmd) {
      if ((0, _isNil.default)(cmd)) {
        return Promise.reject('Unable to detect editor');
      }

      return cmd;
    });
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

function createRelease(log, module, repository, tag, options) {
  options = _objectSpread({
    dryRun: false
  }, options || {}); // Resolve immediately for dry runs

  if (options.dryRun) {
    log.info("Creating release \"".concat(tag, "\" on \"RadonApp/radon-extension-").concat(module.key, "\" (skipped, dry run)"));
    return Promise.resolve();
  } // Retrieve tag details


  return _github.GithubApi.repos.getReleaseByTag({
    owner: 'RadonApp',
    repo: "radon-extension-".concat(module.key),
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
      return extractReleaseNotes(message).replace(GroupTitleRegex, '**$1**\n\n');
    }) // Open editor (to allow the editing of release notes)
    .then(function (notes) {
      return openEditor(module, notes);
    }) // Create release
    .then(function (notes) {
      return _github.GithubApi.repos.createRelease({
        'owner': 'RadonApp',
        'repo': "radon-extension-".concat(module.key),
        'tag_name': tag,
        'prerelease': !(0, _isNil.default)(_semver.default.prerelease(tag)),
        'name': tag,
        'body': notes
      }).then(function () {
        log.info(_chalk.default.green("[".concat(module.name, "] Created release: ").concat(tag)));
      });
    });
  });
}

function updatePackageRelease(log, extension, repository, modules, tag, options) {
  options = _objectSpread({
    dryRun: false
  }, options || {}); // Resolve immediately for dry runs

  if (options.dryRun) {
    log.info("Updating package release \"".concat(tag, "\" on \"RadonApp/radon-extension-").concat(extension.key, "\" (skipped, dry run)"));
    return Promise.resolve();
  } // Retrieve tag details


  return _github.GithubApi.repos.getReleases({
    'owner': 'RadonApp',
    'repo': "radon-extension-".concat(extension.key),
    'per_page': 5
  }).then(function (_ref2) {
    var releases = _ref2.data;
    var release = (0, _find.default)(releases, function (release) {
      return release.tag_name === tag;
    });

    if ((0, _isNil.default)(release)) {
      return Promise.reject(new Error("Unable to find \"".concat(tag, "\" release")));
    }

    if (!release.draft) {
      return Promise.reject(new Error("Release \"".concat(tag, "\" has already been published")));
    } // Retrieve tag message


    return repository.tag(['-l', '--format="%(contents)"', tag]) // Extract release notes from tag message
    .then(function (message) {
      return extractReleaseNotes(message).replace(GroupTitleRegex, '**$1**\n\n');
    }) // Retrieve release notes for modules
    .then(function (notes) {
      return getReleaseNotesForModules(modules, tag).then(function (moduleNotes) {
        var _ref3;

        notes = (_ref3 = [notes]).concat.apply(_ref3, _toConsumableArray(moduleNotes)); // Remove non-existent notes

        (0, _remove.default)(notes, function (notes) {
          return (0, _isNil.default)(notes) || notes.length < 1;
        }); // Join notes from all modules

        return notes.join('\n\n');
      });
    }) // Open editor (to allow the editing of release notes)
    .then(function (notes) {
      return openEditor(extension, notes);
    }) // Update release notes
    .then(function (notes) {
      return _github.GithubApi.repos.editRelease({
        'owner': 'RadonApp',
        'repo': "radon-extension-".concat(extension.key),
        'id': release.id,
        'tag_name': tag,
        'prerelease': !(0, _isNil.default)(_semver.default.prerelease(tag)),
        'name': tag,
        'body': notes
      }).then(function () {
        log.info(_chalk.default.green("[".concat(extension.name, "] Updated release: ").concat(tag)));
      });
    });
  }, function (err) {
    var details;

    try {
      details = JSON.parse(err);
    } catch (e) {
      log.debug("[".concat(extension.name, "] Unable to parse error details: ").concat(e));
      return Promise.reject(new Error("Unable to retrieve release notes for \"".concat(tag, "\" on \"RadonApp/radon-extension-").concat(extension.key, "\"")));
    }

    return Promise.reject(new Error("Unable to retrieve release notes for \"".concat(tag, "\" on \"RadonApp/radon-extension-").concat(extension.key, "\"") + ": ".concat(details.message)));
  });
}