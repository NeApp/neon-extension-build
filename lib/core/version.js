"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolve = resolve;
exports.resolveBrowser = resolveBrowser;
exports["default"] = void 0;

var _isNil = _interopRequireDefault(require("lodash/isNil"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function generateVersionName(_ref) {
  var commit = _ref.commit,
      branch = _ref.branch,
      tag = _ref.tag,
      version = _ref.version,
      repository = _ref.repository;
  var dirty = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  // Append repository identifier
  if ((0, _isNil["default"])(tag) && !(0, _isNil["default"])(branch)) {
    if (branch === 'master') {
      version += '-pre';
    } else {
      version += '-dev'; // Append branch name (for unknown branches)

      if (branch !== 'develop') {
        version += "-".concat(branch.replace(/[^A-Za-z0-9]+/g, '-'));
      }
    } // Append short commit sha


    if (!(0, _isNil["default"])(commit)) {
      version += "-".concat(commit.substring(0, 7));
    }
  } // Append repository "dirty" tag


  if (dirty || repository.dirty) {
    version += '-dirty';
  }

  return version;
}

function generateVersion(_ref2) {
  var travis = _ref2.travis,
      version = _ref2.version;
  version = version.substring(0, version.indexOf('-')) || version; // Add travis build number (if defined)

  if (!(0, _isNil["default"])(travis.number)) {
    return "".concat(version, ".").concat(travis.number);
  } // Return plain version


  return version;
}

function isTagValid(_ref3) {
  var repository = _ref3.repository,
      tag = _ref3.tag,
      version = _ref3.version;

  if ((0, _isNil["default"])(tag) || repository.dirty) {
    return true;
  }

  return tag.indexOf("v".concat(version)) === 0;
}

function resolve(module) {
  if (!isTagValid(module)) {
    throw new Error("Tag \"".concat(module.tag, "\" should match the package version \"").concat(module.version, "\""));
  }

  return {
    version: generateVersionName(module)
  };
}

function resolveBrowser(browser) {
  if (!isTagValid(browser.extension)) {
    throw new Error("Tag \"".concat(browser.extension.tag, "\" should match the package version \"").concat(browser.extension.version, "\""));
  }

  return {
    version: generateVersion(browser.extension),
    versionName: generateVersionName(browser.extension, browser.extension.dirty)
  };
}

var _default = {
  resolve: resolve,
  resolveBrowser: resolveBrowser
};
exports["default"] = _default;