"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.CreditsTask = exports.BaseAuthor = void 0;

var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));

var _credits = _interopRequireDefault(require("@fuzeman/credits"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _filter = _interopRequireDefault(require("lodash/filter"));

var _get = _interopRequireDefault(require("lodash/get"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _isNumber = _interopRequireDefault(require("lodash/isNumber"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _keyBy = _interopRequireDefault(require("lodash/keyBy"));

var _map = _interopRequireDefault(require("lodash/map"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _mkdirp = _interopRequireDefault(require("mkdirp"));

var _omitBy = _interopRequireDefault(require("lodash/omitBy"));

var _orderBy = _interopRequireDefault(require("lodash/orderBy"));

var _path = _interopRequireDefault(require("path"));

var _pick = _interopRequireDefault(require("lodash/pick"));

var _reduce = _interopRequireDefault(require("lodash/reduce"));

var _uniq = _interopRequireDefault(require("lodash/uniq"));

var _clean = _interopRequireDefault(require("../clean"));

var _json = _interopRequireDefault(require("../../core/json"));

var _helpers = require("../../core/helpers");

var _value = require("../../core/helpers/value");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

var BaseAuthor = {
  name: null,
  email: null,
  type: null,
  commits: 0,
  modules: [],
  packages: []
};
exports.BaseAuthor = BaseAuthor;

function mergeContributor(a, b) {
  return (0, _merge.default)(a, _extends({}, b, {
    commits: a.commits + b.commits,
    modules: (0, _uniq.default)(_toConsumableArray(a.modules).concat(_toConsumableArray(b.modules))),
    packages: (0, _uniq.default)(_toConsumableArray(a.packages).concat(_toConsumableArray(b.packages)))
  }));
}

function getLibraries(modules) {
  var libraries = {};

  for (var i = 0; i < modules.length; i++) {
    for (var key in modules[i]) {
      if (!modules[i].hasOwnProperty(key)) {
        continue;
      }

      var credit = modules[i][key];
      var creditKey = (0, _value.sortKey)(credit.name);

      if ((0, _isNil.default)(credit.name) || credit.name.length < 1) {
        continue;
      }

      if ((0, _isNil.default)(credit.packages)) {
        continue;
      }

      for (var h = 0; h < credit.packages.length; h++) {
        var library = credit.packages[h];
        var libraryKey = (0, _value.sortKey)(library);

        if ((0, _isNil.default)(library)) {
          continue;
        } // Ignore "neon-extension-" libraries


        if (library.indexOf('neon-extension-') === 0) {
          continue;
        } // Ensure library exists


        if ((0, _isNil.default)(libraries[libraryKey])) {
          libraries[libraryKey] = {
            name: library,
            credits: {}
          };
        } // Add `credit` to library


        libraries[libraryKey].credits[creditKey] = {
          name: credit.name,
          email: credit.email
        };
      }
    }
  } // Order libraries by name


  return (0, _orderBy.default)((0, _map.default)(Object.values(libraries), function (library) {
    return _extends({}, library, {
      credits: Object.values(library.credits)
    });
  }), [function (library) {
    return (0, _value.sortKey)(library.name);
  }], ['asc']);
}

function getPeople(modules) {
  var credits = {};

  for (var i = 0; i < modules.length; i++) {
    for (var key in modules[i]) {
      if (!modules[i].hasOwnProperty(key)) {
        continue;
      } // Merge module contributor with existing data


      credits[key] = mergeContributor(_extends({}, (0, _cloneDeep.default)(BaseAuthor), credits[key]), _extends({}, (0, _cloneDeep.default)(BaseAuthor), (0, _pick.default)(modules[i][key], Object.keys(BaseAuthor))));
    }
  } // Sort credits


  var result = (0, _orderBy.default)(Object.values(credits), [// Contributors
  'modules.length', 'commits', // Package Authors and Maintainers
  'packages.length', function (credit) {
    return (0, _value.sortKey)(credit.name);
  }], ['desc', 'desc', 'desc', 'asc']); // Remove credits without any commits, modules or packages

  result = (0, _omitBy.default)(result, function (credit) {
    return credit.commits < 1 && credit.modules.length < 1 && credit.packages.length < 1;
  }); // Remove credit properties with values: [], 0, null, undefined

  return (0, _map.default)(result, function (credit) {
    return (0, _omitBy.default)(credit, function (value) {
      return (0, _isNil.default)(value) || Array.isArray(value) && value.length < 1 || (0, _isNumber.default)(value) && value === 0;
    });
  });
}

function fetchPackageCredits(path) {
  function process(credits, initial) {
    return (0, _reduce.default)(credits, function (result, value) {
      if (Array.isArray(value)) {
        process(value, initial);
      } else {
        result.push(value);
      }

      return result;
    }, initial);
  }

  return (0, _credits.default)(path).then(function (credits) {
    return {
      bower: process(credits.bower, []),
      jspm: process(credits.jspm, []),
      npm: process(credits.npm, [])
    };
  });
}

function fetchCredits(name, path) {
  return _json.default.read(_path.default.join(path, 'contributors.json'), []).then(function (contributors) {
    var result = (0, _keyBy.default)((0, _map.default)(contributors, function (contributor) {
      return _extends({}, contributor, {
        modules: [name],
        packages: []
      });
    }), 'name'); // Fetch package credits

    return fetchPackageCredits(path).then(function (credits) {
      for (var type in credits) {
        if (!credits.hasOwnProperty(type)) {
          continue;
        }

        for (var i = 0; i < credits[type].length; i++) {
          var person = credits[type][i];

          if (!(0, _isPlainObject.default)(person)) {
            continue;
          }

          if ((0, _isNil.default)(person.name) || person.name.length < 1) {
            continue;
          } // Move "neon-extension-" packages to modules


          person.modules = (0, _filter.default)(person.packages, function (name) {
            return name.indexOf('neon-extension-') === 0;
          });
          person.packages = (0, _filter.default)(person.packages, function (name) {
            return name.indexOf('neon-extension-') < 0;
          });
          var key = person.name; // Include `person` in `result`

          if ((0, _isNil.default)(result[key])) {
            result[key] = person;
          } else {
            result[key] = _extends({}, (0, _get.default)(result, [key], {}), person, {
              modules: _toConsumableArray((0, _get.default)(result, [key, 'modules'], [])).concat(_toConsumableArray((0, _get.default)(person, 'modules', []))),
              packages: _toConsumableArray((0, _get.default)(result, [key, 'packages'], [])).concat(_toConsumableArray((0, _get.default)(person, 'packages', [])))
            });
          }
        }
      }

      return result;
    });
  });
}

var CreditsTask = _helpers.Task.create({
  name: 'build:credits',
  description: 'Build extension credits.',
  required: [_clean.default]
}, function (log, browser, environment) {
  // Ensure output directory exists
  _mkdirp.default.sync(environment.outputPath); // Build list of packages


  var modules = Object.values(browser.modules).concat([{
    name: 'neon-extension-build',
    path: environment.builderPath
  }]); // Fetch module credits

  return Promise.all((0, _map.default)(modules, function (pkg) {
    log.debug("Fetching credits for \"".concat(pkg.name, "\"..."));
    return fetchCredits(pkg.name, pkg.path);
  })).then(function (modules) {
    var credits = {
      libraries: getLibraries(modules),
      people: getPeople(modules)
    };
    log.debug("Writing credits for ".concat(modules.length, " module(s) ") + "[".concat(credits.libraries.length, " libraries, ").concat(credits.people.length, " people]")); // Write credits to build directory

    return _fsExtra.default.writeJson(_path.default.join(environment.outputPath, 'credits.json'), credits, {
      spaces: 2
    });
  });
});

exports.CreditsTask = CreditsTask;
var _default = CreditsTask;
exports.default = _default;