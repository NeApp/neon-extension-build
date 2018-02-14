"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolve = resolve;
exports.resolveBrowser = resolveBrowser;
exports.default = void 0;

var _isNil = _interopRequireDefault(require("lodash/isNil"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function isDirty(_ref) {
  var extension = _ref.extension,
      modules = _ref.modules;

  if (extension.repository.dirty) {
    return true;
  }

  for (var name in modules) {
    if (!modules.hasOwnProperty(name)) {
      continue;
    }

    if (modules[name].repository.dirty) {
      return true;
    }
  }

  return false;
}

function generateVersionName(_ref2) {
  var commit = _ref2.commit,
      branch = _ref2.branch,
      tag = _ref2.tag,
      version = _ref2.version,
      repository = _ref2.repository;
  var dirty = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  // Append repository identifier
  if ((0, _isNil.default)(tag)) {
    if ((0, _isNil.default)(branch)) {
      throw new Error('No branch or tag defined');
    }

    if (branch === 'master') {
      version += '-pre';
    } else {
      version += '-dev'; // Append branch name (for unknown branches)

      if (branch !== 'develop') {
        version += "-".concat(branch.replace(/[^A-Za-z0-9]+/g, '-'));
      }
    } // Append short commit sha


    if (!(0, _isNil.default)(commit)) {
      version += "-".concat(commit.substring(0, 7));
    }
  } // Append repository "dirty" tag


  if (dirty || repository.dirty) {
    version += '-dirty';
  }

  return version;
}

function generateVersion(_ref3) {
  var travis = _ref3.travis,
      version = _ref3.version;
  version = version.substring(0, version.indexOf('-')) || version; // Add travis build number (if defined)

  if (!(0, _isNil.default)(travis.number)) {
    return "".concat(version, ".").concat(travis.number);
  } // Return plain version


  return version;
}

function resolve(module) {
  if (!(0, _isNil.default)(module.tag) && module.tag.indexOf("v".concat(module.version)) !== 0) {
    throw new Error("Tag \"".concat(module.tag, "\" should match the package version \"").concat(module.version, "\""));
  }

  return {
    version: generateVersionName(module)
  };
}

function resolveBrowser(browser) {
  if (!(0, _isNil.default)(module.tag) && module.tag.indexOf("v".concat(module.version)) !== 0) {
    throw new Error("Tag \"".concat(module.tag, "\" should match the package version \"").concat(module.version, "\""));
  }

  var dirty = isDirty(browser);
  return {
    version: generateVersion(browser.extension),
    versionName: generateVersionName(browser.extension, dirty),
    dirty: dirty
  };
}

var _default = {
  resolve: resolve,
  resolveBrowser: resolveBrowser
};
exports.default = _default;