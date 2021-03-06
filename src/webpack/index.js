import Chalk from 'chalk';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import Filesystem from 'fs';
import Filter from 'lodash/filter';
import Find from 'lodash/find';
import ForEach from 'lodash/forEach';
import FunctionModulePlugin from 'webpack/lib/FunctionModulePlugin';
import IsNil from 'lodash/isNil';
import Map from 'lodash/map';
import MapKeys from 'lodash/mapKeys';
import MapValues from 'lodash/mapValues';
import Merge from 'lodash/merge';
import Path from 'path';
import Pick from 'lodash/pick';
import PickBy from 'lodash/pickBy';
import SortBy from 'lodash/sortBy';
import Webpack from 'webpack';

import Validator from './validator';
import Vorpal from '../core/vorpal';
import {createChunks} from './chunks';
import {resolvePath} from '../core/helpers/path';


const Logger = Vorpal.logger;

function cleanModuleIdentifier(value) {
    return value.replace(/\s/g, '/').replace(/\\/g, '/');
}

function encodeExtensionManifest(browser) {
    return {
        name: null,

        version: null,
        versionName: null,

        // Extension
        ...Pick(browser.extension, [
            'name',
            'version',

            'title',
            'description',

            // Required Permissions
            'origins',
            'permissions',

            // Optional Permissions
            'optional_origins',
            'optional_permissions'
        ]),

        // Browser
        ...Pick(browser, [
            'version',
            'versionName'
        ]),

        // Repository Details
        repository: {
            ...browser.extension.repository,

            dirty: browser.extension.dirty
        }
    };
}

function encodeModuleManifests(modules) {
    let manifests = MapKeys(MapValues(modules || {}, (module) => Pick(module, [
        'id',
        'key',

        'name',
        'type',

        'title',
        'version',

        'content_scripts',
        'services',

        // Repository Details
        'repository',

        // Required Permissions
        'origins',
        'permissions',

        // Optional Permissions
        'optional_origins',
        'optional_permissions'
    ])), (manifest) => {
        if(['core', 'package', 'tool'].indexOf(manifest.type) < 0) {
            return `neon-extension-${manifest.type}-${manifest.id}`;
        }

        return `neon-extension-${manifest.id}`;
    });

    // Sort manifests by key
    return Pick(manifests, Object.keys(manifests).sort());
}

function getBabelPaths(browser, sourceOnly = false) {
    let modules = Filter(browser.modules, (module) => module.type !== 'package');

    // Build list of babel includes
    let items = [];

    ForEach(SortBy(modules, 'name'), (module) => {
        // Include source directory
        items.push(module.path);

        if(sourceOnly) {
            return;
        }

        // Include additional directories from manifest
        items.push(...module.webpack.babel
            .map((path) => resolvePath(
                Path.resolve(browser.path, path),
                Path.resolve(module.path, path)
            ))
            .filter((value) =>
                value !== null
            )
        );
    });

    return items;
}

function getModuleAliases(browser) {
    let modules = Filter(browser.modules, (module) => module.type !== 'package');

    return Object.assign({}, ...SortBy(modules, 'name').map((module) => {
        let result = {};

        // Module
        result[module.name] = module.path;

        // Aliases
        for(let name in module.webpack.alias) {
            if(!module.webpack.alias.hasOwnProperty(name)) {
                continue;
            }

            let target = module.webpack.alias[name];

            // Parse alias
            if(target === './') {
                result[name] = module.path;
            } else {
                result[name] = target;
            }
        }


        return result;
    }));
}

function getModuleName(basePath, path) {
    path = Path.normalize(Path.relative(basePath, path));

    let end = path.indexOf(Path.sep);

    if(path[0] === '@') {
        end = path.indexOf(Path.sep, end + 1);
    }

    return path.substring(0, end);
}

function getModuleDetails(browser, environment, path) {
    if(IsNil(path)) {
        return null;
    }

    // Normalize path
    path = Path.normalize(path);

    // Find matching module
    let module = Find(browser.modules, (module) => {
        if(module.type === 'package') {
            return false;
        }

        return path.startsWith(module.path);
    });

    // Module
    if(!IsNil(module)) {
        if(path.startsWith(Path.resolve(module.path, 'node_modules'))) {
            return {
                type: 'dependency',
                name: getModuleName(Path.resolve(module.path, 'node_modules'), path)
            };
        }

        if(module.name === '@radon-extension/core') {
            return {
                type: 'core',
                name: module.name
            };
        }

        if(module.name === '@radon-extension/framework') {
            return {
                type: 'framework',
                name: module.name
            };
        }

        if(module.name.startsWith('@radon-extension/plugin-')) {
            return {
                type: 'plugin',
                name: module.name
            };
        }
    }

    // Package
    if(path.startsWith(Path.resolve(browser.path, 'node_modules'))) {
        return {
            type: 'dependency',
            name: getModuleName(Path.resolve(browser.path, 'node_modules'), path)
        };
    }

    return null;
}

function generateModuleIdentifier(browser, environment, module, fallback) {
    let suffix = '';

    // Append module identifier on conflicts
    if(fallback) {
        suffix = `#${module.moduleId}`;
    }

    // Ignored
    if(module.absoluteResourcePath.indexOf('ignored ') === 0) {
        return `webpack://${cleanModuleIdentifier(module.shortIdentifier)}${suffix}`;
    }

    // Bootstrap
    if(module.absoluteResourcePath.indexOf('webpack/bootstrap ') === 0) {
        return `webpack://${cleanModuleIdentifier(module.shortIdentifier)}${suffix}`;
    }

    // Convert to relative path
    let path = Path.resolve(environment.options['package-dir'], module.absoluteResourcePath);

    // Build module identifier
    return `webpack://${cleanModuleIdentifier(Path.relative(environment.options['package-dir'], path))}${suffix}`;
}

function isSharedDependency(browser, name) {
    return !(IsNil(name) || name.startsWith('@radon-extension/'));
}

function shouldExtractModule(browser, environment, module, count, options) {
    options = Merge({
        chunk: null,

        count: 2,
        shared: false,
        types: []
    }, options || {});

    // Validate options
    if(IsNil(options.chunk)) {
        throw new Error('Missing required option: chunk');
    }

    // Retrieve module details
    let details = {
        name: null,
        type: null,

        ...(getModuleDetails(browser, environment, module.userRequest, options) || {})
    };

    // Determine if module should be included
    let include = false;

    if(count >= options.count) {
        include = true;
    } else if(options.types.indexOf(details.type) >= 0) {
        include = true;
    } else if(options.shared && details.type === 'dependency' && isSharedDependency(browser, details.name)) {
        include = true;
    }

    // Log module
    Logger.debug((include ? Chalk.green : Chalk.red)(
        `[${options.chunk}] ${module.userRequest} (` +
            `count: ${count}, ` +
            `type: "${details.type}", ` +
            `shared: ${isSharedDependency(browser, details.name)}` +
        ')'
    ));

    // Ignore excluded/invalid modules
    if(IsNil(module.userRequest) || !include) {
        return include;
    }

    // Shorten request
    let request = module.userRequest;

    if(!IsNil(details.name)) {
        let start = request.indexOf(details.name);

        if(start >= 0) {
            request = request.substring(start);
        }
    }

    // Store extracted module location
    environment.webpack.extracted[request] = options.chunk;

    return include;
}

export function createConfiguration(browser, environment) {
    let output = {
        filename: '[name].js',
        path: environment.outputPath,

        devtoolModuleFilenameTemplate: (module) => {
            return generateModuleIdentifier(browser, environment, module);
        },

        devtoolFallbackModuleFilenameTemplate: (module) => {
            return generateModuleIdentifier(browser, environment, module, true);
        }
    };

    return {
        profile: true,

        devtool: environment.webpack.devtool,
        target: () => undefined,

        entry: createChunks(browser, environment),
        output,

        module: {
            rules: [
                {
                    test: /\.js$/,
                    include: getBabelPaths(browser, true),
                    exclude: /(node_modules)/,

                    enforce: 'pre',
                    use: ['eslint-loader']
                },
                {
                    test: /\.js$/,
                    include: [
                        Filesystem.realpathSync(Path.resolve(browser.path, 'node_modules/foundation-sites')),
                        Filesystem.realpathSync(Path.resolve(browser.path, 'node_modules/lodash-es')),
                        Filesystem.realpathSync(Path.resolve(browser.path, 'node_modules/wes')),

                        ...getBabelPaths(browser)
                    ],

                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                cacheDirectory: Path.join(browser.path, '.babel/cache'),

                                plugins: [
                                    '@babel/proposal-class-properties',
                                    '@babel/proposal-object-rest-spread'
                                ],

                                presets: [
                                    '@babel/env',
                                    '@babel/react'
                                ]
                            }
                        }
                    ]
                },
                {
                    test: /\.css$/,
                    use: ['file-loader']
                },
                {
                    test: /\.scss$/,
                    use: ExtractTextPlugin.extract({
                        fallback: 'style-loader',
                        use: [
                            {
                                loader: 'css-loader'
                            },
                            {
                                loader: 'sass-loader',
                                options: {
                                    includePaths: [
                                        Filesystem.realpathSync(Path.resolve(
                                            browser.path, 'node_modules/foundation-sites/scss'
                                        ))
                                    ]
                                }
                            }
                        ]
                    })
                }
            ]
        },

        plugins: [
            new Webpack.JsonpTemplatePlugin(output),
            new FunctionModulePlugin(output),
            new Webpack.LoaderTargetPlugin('web'),

            //
            // Commons Chunks
            //

            new Webpack.optimize.CommonsChunkPlugin({
                name: 'Background/Common',

                chunks: [
                    'Background/Messaging',

                    'Background/Services/App',
                    'Background/Services/Callback',
                    'Background/Services/ContentScript',
                    'Background/Services/Library',
                    'Background/Services/Migrate',
                    'Background/Services/Scrobble'
                ],

                minChunks: (module, count) => shouldExtractModule(browser, environment, module, count, {
                    chunk: 'Background/Common',

                    shared: true,
                    types: ['browser', 'framework']
                })
            }),

            new Webpack.optimize.CommonsChunkPlugin({
                name: 'Plugins/Common',

                chunks: [].concat(...Map(browser.modules, (module) => {
                    let chunks = [];

                    // Include main module
                    if(['source'].indexOf(module.type) >= 0) {
                        chunks.push(`Plugins/${module.id}/Main`);
                    }

                    // Include additional modules
                    ForEach(PickBy(module.webpack.modules, ({entry}) => !entry), (_, name) => {
                        chunks.push(`Plugins/${module.id}/${name}`);
                    });

                    return chunks;
                })),

                minChunks: (module, count) => shouldExtractModule(browser, environment, module, count, {
                    chunk: 'Plugins/Common',

                    shared: true,
                    types: ['browser', 'core', 'framework']
                })
            }),

            new Webpack.optimize.CommonsChunkPlugin({
                name: 'Common',

                chunks: [
                    'Background/Common',
                    'Plugins/Common',

                    'Application'
                ],

                minChunks: (module, count) => shouldExtractModule(browser, environment, module, count, {
                    chunk: 'Common'
                })
            }),

            //
            // Compiler Definitions
            //

            new Webpack.DefinePlugin({
                'global': 'window',

                'neon.browser': JSON.stringify({
                    name: browser.name,
                    features: browser.features
                }),
                'neon.manifests': JSON.stringify({
                    'neon-extension': encodeExtensionManifest(browser),

                    ...encodeModuleManifests(browser.modules)
                }),

                'process.env': {
                    'NODE_ENV': JSON.stringify(environment.name)
                }
            }),

            //
            // Compiler Provides
            //

            new Webpack.ProvidePlugin({
                '$': 'jquery',
                'jQuery': 'jquery',

                'process': 'process'
            }),

            //
            // Extract CSS into separate files
            //

            new ExtractTextPlugin({
                filename: '[name].css',
                allChunks: true
            }),

            //
            // Loader Options
            //

            new Webpack.LoaderOptionsPlugin({
                debug: environment.webpack.debug,
                minimize: environment.webpack.minimize
            }),

            //
            // Development
            //

            ...(environment.webpack.validate ? [
                Validator.createPlugin(browser, environment)
            ] : []),

            //
            // Production
            //

            ...(environment.webpack.minimize ? [
                new Webpack.HashedModuleIdsPlugin(),
                new Webpack.NamedChunksPlugin(),

                new Webpack.optimize.UglifyJsPlugin()
            ] : [])
        ],

        externals: {
            'jquery': 'jQuery',
            'react': 'React',
            'react-dom': 'ReactDOM'
        },

        resolve: {
            mainFields: [
                'browser',
                'module',
                'main'
            ],

            modules: [
                // Shared modules
                Path.resolve(browser.path, 'node_modules'),

                // Local modules
                'node_modules'
            ],

            alias: {
                ...getModuleAliases(browser),

                'lodash': 'lodash-es',
                'lodash-amd': 'lodash-es'
            },

            aliasFields: [
                'browser'
            ]
        }
    };
}
