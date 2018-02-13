"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createConfiguration = createConfiguration;

var _chalk = _interopRequireDefault(require("chalk"));

var _extractTextWebpackPlugin = _interopRequireDefault(require("extract-text-webpack-plugin"));

var _fs = _interopRequireDefault(require("fs"));

var _filter = _interopRequireDefault(require("lodash/filter"));

var _find = _interopRequireDefault(require("lodash/find"));

var _forEach = _interopRequireDefault(require("lodash/forEach"));

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _mapValues = _interopRequireDefault(require("lodash/mapValues"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _path = _interopRequireDefault(require("path"));

var _pick = _interopRequireDefault(require("lodash/pick"));

var _sortBy = _interopRequireDefault(require("lodash/sortBy"));

var _webpack = _interopRequireDefault(require("webpack"));

var _validator = _interopRequireDefault(require("./validator"));

var _vorpal = _interopRequireDefault(require("../core/vorpal"));

var _chunks = require("./chunks");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

var Logger = _vorpal.default.logger;

function cleanModuleIdentifier(value) {
  return value.replace(/\s/g, '/').replace(/\\/g, '/');
}

function encodeExtensionManifest(extension) {
  return _extends({}, (0, _pick.default)(extension, ['name', 'version', 'title', 'description', // Required Permissions
  'origins', 'permissions', // Optional Permissions
  'optional_origins', 'optional_permissions']));
}

function encodeModuleManifests(modules) {
  var manifests = (0, _mapValues.default)(modules || {}, function (module) {
    return (0, _pick.default)(module, ['name', 'type', 'key', 'title', 'version', 'content_scripts', 'services', // Required Permissions
    'origins', 'permissions', // Optional Permissions
    'optional_origins', 'optional_permissions']);
  }); // Sort manifests by key

  return (0, _pick.default)(manifests, Object.keys(manifests).sort());
}

function getValidPath() {
  for (var i = 0; i < arguments.length; i++) {
    if (_fs.default.existsSync(i < 0 || arguments.length <= i ? undefined : arguments[i])) {
      return i < 0 || arguments.length <= i ? undefined : arguments[i];
    }
  }

  return null;
}

function getBabelPaths(browser, environment) {
  var modules = (0, _filter.default)(browser.modules, function (module) {
    return module.type !== 'package';
  }); // Build list of babel includes

  var items = [];
  (0, _forEach.default)((0, _sortBy.default)(modules, 'name'), function (module) {
    // Include source directory
    items.push(_path.default.resolve(module.path, 'src')); // Include additional directories from manifest

    items.push.apply(items, _toConsumableArray(module.webpack.babel.map(function (path) {
      return getValidPath(_path.default.resolve(module.path, path), // Fallback to package modules
      _path.default.resolve(browser.path, path));
    }).filter(function (value) {
      return value !== null;
    })));
  });
  return items;
}

function getModuleAliases(browser) {
  var modules = (0, _filter.default)(browser.modules, function (module) {
    return module.type !== 'package';
  });
  return Object.assign.apply(Object, [{}].concat(_toConsumableArray((0, _sortBy.default)(modules, 'name').map(function (module) {
    var result = {}; // Module

    result[module.name] = _path.default.resolve(module.path, 'src'); // Aliases

    for (var name in module.webpack.alias) {
      if (!module.webpack.alias.hasOwnProperty(name)) {
        continue;
      }

      var target = module.webpack.alias[name]; // Parse alias

      if (target === './') {
        result[name] = _path.default.resolve(module.path, 'src');
      } else {
        result[name] = target;
      }
    }

    return result;
  }))));
}

function getModuleName(basePath, path) {
  path = _path.default.normalize(_path.default.relative(basePath, path));
  var end = path.indexOf(_path.default.sep);

  if (path[0] === '@') {
    end = path.indexOf(_path.default.sep, end + 1);
  }

  return path.substring(0, end);
}

function getModuleDetails(browser, environment, path) {
  if ((0, _isNil.default)(path)) {
    return null;
  } // Normalize path


  path = _path.default.normalize(path); // Find matching module

  var module = (0, _find.default)(browser.modules, function (module) {
    if (module.type === 'package') {
      return false;
    }

    return path.startsWith(module.path);
  }); // Module

  if (!(0, _isNil.default)(module)) {
    if (path.startsWith(_path.default.resolve(module.path, 'node_modules'))) {
      return {
        type: 'dependency',
        name: getModuleName(_path.default.resolve(module.path, 'node_modules'), path)
      };
    }

    if (module.name === 'neon-extension-core') {
      return {
        type: 'core',
        name: module.name
      };
    }

    if (module.name === 'neon-extension-framework') {
      return {
        type: 'framework',
        name: module.name
      };
    }

    if (module.name.startsWith('neon-extension-browser-')) {
      return {
        type: 'browser',
        name: module.name
      };
    }

    if (module.name.startsWith('neon-extension-destination-')) {
      return {
        type: 'destination',
        name: module.name
      };
    }

    if (module.name.startsWith('neon-extension-source-')) {
      return {
        type: 'source',
        name: module.name
      };
    }
  } // Package


  if (path.startsWith(_path.default.resolve(browser.path, 'node_modules'))) {
    return {
      type: 'dependency',
      name: getModuleName(_path.default.resolve(browser.path, 'node_modules'), path)
    };
  }

  return null;
}

function getModulePaths(browser, environment) {
  var modules = (0, _filter.default)(browser.modules, function (module) {
    return module.type !== 'package';
  });
  return [// Shared modules
  _path.default.resolve(browser.path, 'node_modules')].concat(_toConsumableArray((0, _sortBy.default)(modules, 'name').map(function (module) {
    return _path.default.join(module.path, 'node_modules');
  })));
}

function generateModuleIdentifier(browser, environment, module, fallback) {
  var suffix = ''; // Append module identifier on conflicts

  if (fallback) {
    suffix = "#".concat(module.moduleId);
  } // Ignored


  if (module.absoluteResourcePath.indexOf('ignored ') === 0) {
    return "webpack://".concat(cleanModuleIdentifier(module.shortIdentifier)).concat(suffix);
  } // Bootstrap


  if (module.absoluteResourcePath.indexOf('webpack/bootstrap ') === 0) {
    return "webpack://".concat(cleanModuleIdentifier(module.shortIdentifier)).concat(suffix);
  } // Convert to relative path


  var path = _path.default.resolve(environment.options['package-dir'], module.absoluteResourcePath); // Build module identifier


  return "webpack://".concat(cleanModuleIdentifier(_path.default.relative(environment.options['package-dir'], path))).concat(suffix);
}

function isSharedDependency(browser, name) {
  if ((0, _isNil.default)(name) || name.startsWith('neon-extension-')) {
    return false;
  }

  return !(0, _isNil.default)(browser.extension.package.dependencies[name]);
}

function shouldExtractModule(browser, environment, module, count, options) {
  options = (0, _merge.default)({
    chunk: null,
    count: 2,
    shared: false,
    types: []
  }, options || {}); // Validate options

  if ((0, _isNil.default)(options.chunk)) {
    throw new Error('Missing required option: chunk');
  } // Retrieve module details


  var details = _extends({
    name: null,
    type: null
  }, getModuleDetails(browser, environment, module.userRequest, options) || {}); // Determine if module should be included


  var include = false;

  if (count >= options.count) {
    include = true;
  } else if (options.types.indexOf(details.type) >= 0) {
    include = true;
  } else if (options.shared && details.type === 'dependency' && isSharedDependency(browser, details.name)) {
    include = true;
  } // Log module


  Logger.debug((include ? _chalk.default.green : _chalk.default.red)("[".concat(options.chunk, "] ").concat(module.userRequest, " (") + "count: ".concat(count, ", ") + "type: \"".concat(details.type, "\", ") + "shared: ".concat(isSharedDependency(browser, details.name)) + ')')); // Ignore excluded/invalid modules

  if ((0, _isNil.default)(module.userRequest) || !include) {
    return include;
  } // Shorten request


  var request = module.userRequest;

  if (!(0, _isNil.default)(details.name)) {
    var start = request.indexOf(details.name);

    if (start >= 0) {
      request = request.substring(start);
    }
  } // Store extracted module location


  environment.webpack.extracted[request] = options.chunk;
  return include;
}

function createConfiguration(browser, environment) {
  var _ref, _ref2;

  return {
    profile: true,
    devtool: environment.webpack.devtool,
    entry: (0, _chunks.createChunks)(browser, environment),
    output: {
      filename: '[name].js',
      path: environment.outputPath,
      devtoolModuleFilenameTemplate: function devtoolModuleFilenameTemplate(module) {
        return generateModuleIdentifier(browser, environment, module);
      },
      devtoolFallbackModuleFilenameTemplate: function devtoolFallbackModuleFilenameTemplate(module) {
        return generateModuleIdentifier(browser, environment, module, true);
      }
    },
    module: {
      rules: [{
        test: /\.js$/,
        include: getBabelPaths(browser, environment),
        exclude: /(node_modules)/,
        enforce: 'pre',
        use: [{
          loader: 'eslint-loader',
          options: {
            baseConfig: {
              'settings': {
                'import/resolver': {
                  'eslint-import-resolver-node-extended': {
                    'alias': getModuleAliases(browser, environment),
                    'paths': getModulePaths(browser, environment)
                  }
                }
              }
            }
          }
        }]
      }, {
        test: /\.js$/,
        include: [_path.default.resolve(browser.path, 'node_modules/foundation-sites')],
        use: ['imports-loader?this=>window']
      }, {
        test: /\.js$/,
        include: [_path.default.resolve(browser.path, 'node_modules/foundation-sites'), _path.default.resolve(browser.path, 'node_modules/lodash-es')].concat(_toConsumableArray(getBabelPaths(browser, environment))),
        use: [{
          loader: 'babel-loader',
          options: {
            cacheDirectory: _path.default.join(browser.path, '.babel/cache'),
            plugins: ['@babel/proposal-class-properties', '@babel/proposal-object-rest-spread'],
            presets: ['@babel/env', '@babel/react']
          }
        }]
      }, {
        test: /\.css$/,
        use: ['file-loader']
      }, {
        test: /\.scss$/,
        use: _extractTextWebpackPlugin.default.extract({
          fallback: 'style-loader',
          use: [{
            loader: 'css-loader'
          }, {
            loader: 'sass-loader',
            options: {
              includePaths: [_path.default.resolve(browser.path, 'node_modules/foundation-sites/scss')]
            }
          }]
        })
      }]
    },
    plugins: [//
    // Commons Chunks
    //
    new _webpack.default.optimize.CommonsChunkPlugin({
      name: 'background/common',
      chunks: ['background/main/main', 'background/migrate/migrate', 'background/messaging/messaging', 'background/messaging/services/library', 'background/messaging/services/scrobble', 'background/messaging/services/storage'],
      minChunks: function minChunks(module, count) {
        return shouldExtractModule(browser, environment, module, count, {
          chunk: 'background/common',
          shared: true,
          types: ['browser', 'framework']
        });
      }
    }), new _webpack.default.optimize.CommonsChunkPlugin({
      name: 'destination/common',
      chunks: (_ref = []).concat.apply(_ref, _toConsumableArray((0, _filter.default)(browser.modules, {
        type: 'destination'
      }).map(function (module) {
        return (module.webpack.chunks || []).map(function (chunk) {
          return "destination/".concat(module.key, "/").concat(chunk, "/").concat(chunk);
        });
      }))),
      minChunks: function minChunks(module, count) {
        return shouldExtractModule(browser, environment, module, count, {
          chunk: 'destination/common',
          shared: true,
          types: ['browser', 'core', 'framework']
        });
      }
    }), new _webpack.default.optimize.CommonsChunkPlugin({
      name: 'source/common',
      chunks: (_ref2 = []).concat.apply(_ref2, _toConsumableArray((0, _filter.default)(browser.modules, {
        type: 'source'
      }).map(function (module) {
        return ["source/".concat(module.key, "/").concat(module.key)].concat(_toConsumableArray((module.webpack.chunks || []).map(function (chunk) {
          return "source/".concat(module.key, "/").concat(chunk, "/").concat(chunk);
        })));
      }))),
      minChunks: function minChunks(module, count) {
        return shouldExtractModule(browser, environment, module, count, {
          chunk: 'source/common',
          shared: true,
          types: ['browser', 'core', 'framework']
        });
      }
    }), new _webpack.default.optimize.CommonsChunkPlugin({
      name: 'common',
      chunks: ['background/common', 'destination/common', 'source/common', 'configuration/configuration'],
      minChunks: function minChunks(module, count) {
        return shouldExtractModule(browser, environment, module, count, {
          chunk: 'common'
        });
      }
    }), //
    // Compiler Definitions
    //
    new _webpack.default.DefinePlugin({
      'neon.browser': JSON.stringify(browser.supports),
      'neon.manifests': JSON.stringify(_extends({
        'neon-extension': encodeExtensionManifest(browser.extension)
      }, encodeModuleManifests(browser.modules))),
      'process.env': {
        'NODE_ENV': JSON.stringify(environment.name)
      }
    }), //
    // Compiler Provides
    //
    new _webpack.default.ProvidePlugin({
      '$': 'jquery',
      'jQuery': 'jquery'
    }), //
    // Extract CSS into separate files
    //
    new _extractTextWebpackPlugin.default({
      filename: '[name].css',
      allChunks: true
    }), //
    // Loader Options
    //
    new _webpack.default.LoaderOptionsPlugin({
      debug: environment.webpack.debug,
      minimize: environment.webpack.minimize
    })].concat(_toConsumableArray(environment.webpack.validate ? [_validator.default.createPlugin(browser, environment)] : []), _toConsumableArray(environment.webpack.minimize ? [new _webpack.default.HashedModuleIdsPlugin(), new _webpack.default.NamedChunksPlugin(), new _webpack.default.optimize.UglifyJsPlugin()] : [])),
    externals: {
      'jquery': 'jQuery',
      'react': 'React',
      'react-dom': 'ReactDOM'
    },
    resolve: {
      modules: [// Shared modules
      _path.default.resolve(browser.path, 'node_modules'), // Local modules
      'node_modules'],
      alias: _extends({}, getModuleAliases(browser), {
        'lodash-amd': 'lodash-es'
      })
    }
  };
}