import Chalk from 'chalk';
import Filesystem from 'fs';
import Filter from 'lodash/filter';
import ForEach from 'lodash/forEach';
import IsNil from 'lodash/isNil';
import Merge from 'lodash/merge';
import Path from 'path';
import SortBy from 'lodash/sortBy';

import Vorpal from '../core/vorpal';
import {isDirectory, resolvePath} from '../core/helpers/path';


const Logger = Vorpal.logger;

function getServices(modules, type, options) {
    options = Merge({
        includeComponents: false
    }, options);

    // Build service name
    let name = type.substring(type.indexOf('/') + 1);

    // Find matching services
    let items = [];

    ForEach(SortBy(modules, 'name'), (module) => {
        // Ensure module has services
        if(typeof module.services === 'undefined') {
            return;
        }

        // Ensure module has the specified service
        if(module.services.indexOf(type) === -1) {
            return;
        }

        // Build service directory path
        let serviceBasePath = Path.resolve(module.path, `src/services/${name}`);

        // Resolve service path
        let servicePath = resolvePath([
            Path.resolve(serviceBasePath, 'index.js'),
            `${serviceBasePath}.js`
        ]);

        if(IsNil(servicePath)) {
            Logger.error(Chalk.red(`Unable to find "${name}" service for module "${module.name}"`));
            return;
        }

        // Include service
        items.push(servicePath);

        // Include react components (if enabled)
        if(isDirectory(serviceBasePath) && options.includeComponents) {
            let componentsPath = Path.resolve(serviceBasePath, 'components/index.js');

            // Ensure service components exist
            if(Filesystem.existsSync(componentsPath)) {
                items.push(componentsPath);
            }
        }
    });

    return items;
}

function getModuleServices(browser, environment, module) {
    if(typeof module === 'undefined' || module === null) {
        return [];
    }

    if(typeof module.services === 'undefined' || module.services === null) {
        return [];
    }

    // Retrieve core module
    let coreModule = browser.modules['neon-extension-core'];

    // Find module services
    let items = [];

    for(let i = 0; i < module.services.length; i++) {
        let type = module.services[i];

        // Ignore migrate service
        if(type === 'migrate') {
            continue;
        }

        // Build service name
        let name = type.substring(type.indexOf('/') + 1);

        // Build service directory path
        let serviceBasePath = Path.resolve(module.path, `src/services/${name}`);

        // Resolve service path
        let servicePath = resolvePath([
            Path.resolve(serviceBasePath, 'index.js'),
            `${serviceBasePath}.js`
        ]);

        if(IsNil(servicePath)) {
            Logger.error(Chalk.red(`Unable to find "${name}" service for module "${module.name}"`));
            continue;
        }

        // Only include the plugin configuration service
        if(type === 'configuration') {
            items.push(servicePath);
            continue;
        }

        // Build main module path
        let mainPath = Path.resolve(coreModule.path, `src/modules/${type}/index.js`);

        // Ensure main module exists
        if(!Filesystem.existsSync(mainPath)) {
            Logger.error(Chalk.red(
                `Ignoring service "${name}" for module "${module.name}", ` +
                `unable to find main module at: "${mainPath}"`
            ));
            continue;
        }

        // Found service
        items.push(servicePath);
        items.push(mainPath);
    }

    return items;
}

function createModule(browser, environment, module) {
    // Parse module name
    let moduleName = module.name.replace('neon-extension-', '');
    let splitAt = moduleName.indexOf('-');

    if(splitAt < 0) {
        Logger.error(Chalk.red(`Invalid value provided for the "module.name" parameter: ${module.name}`));
        return null;
    }

    let type = moduleName.substring(0, splitAt);
    let plugin = moduleName.substring(splitAt + 1);

    // Build module entry
    let result = {};

    result[`${type}/${plugin}/${plugin}`] = [
        ...browser.webpack.common,
        ...getServices([browser.modules['neon-extension-core']], 'configuration'),
        ...getModuleServices(browser, environment, module)
    ];

    return result;
}

function createModuleChunks(browser, module) {
    // Validate `module` object
    if(typeof module === 'undefined' || module === null) {
        Logger.error(Chalk.red(`Invalid value provided for the "module" parameter: ${module}`));
        return null;
    }

    if(typeof module.name === 'undefined' || module.name === null) {
        Logger.error(Chalk.red(`Invalid value provided for the "module" parameter: ${module}`));
        return null;
    }

    // Parse module name
    let moduleName = module.name.replace('neon-extension-', '');
    let splitAt = moduleName.indexOf('-');

    if(splitAt < 0) {
        Logger.error(Chalk.red(`Invalid value provided for the "module.name" parameter: ${module.name}`));
        return null;
    }

    let type = moduleName.substring(0, splitAt);
    let plugin = moduleName.substring(splitAt + 1);

    // Create module chunks
    let result = {};

    (module.webpack.chunks || []).forEach((name) => {
        result[`${type}/${plugin}/${name}/${name}`] = [
            ...browser.webpack.common,
            `${module.name}/${name}`
        ];
    });

    (module.webpack.modules || []).forEach((name) => {
        result[`${type}/${plugin}/${name}/${name}`] = [
            ...browser.webpack.common,
            `${module.name}/${name}`
        ];
    });

    return result;
}

export function createChunks(browser, environment) {
    let modules = Filter(browser.modules, (module) => module.type !== 'package');
    let destinations = Filter(browser.modules, { type: 'destination' });
    let sources = Filter(browser.modules, { type: 'source' });

    // Create modules
    return {
        'background/main/main': [
            ...browser.webpack.common,
            ...getServices(modules, 'configuration'),
            'neon-extension-core/modules/background/main'
        ],
        'background/migrate/migrate': [
            ...browser.webpack.common,
            ...getServices(modules, 'configuration'),
            ...getServices(modules, 'migrate'),
            'neon-extension-core/modules/background/migrate'
        ],

        //
        // Messaging
        //

        'background/messaging/messaging': [
            ...browser.webpack.common,
            ...getServices(modules, 'configuration'),
            'neon-extension-core/modules/background/messaging'
        ],
        'background/messaging/services/contentScript': [
            ...browser.webpack.common,
            ...getServices(modules, 'configuration'),
            'neon-extension-core/modules/background/messaging/services/contentScript'
        ],
        'background/messaging/services/library': [
            ...browser.webpack.common,
            ...getServices(modules, 'configuration'),
            'neon-extension-core/modules/background/messaging/services/library'
        ],
        'background/messaging/services/scrobble': [
            ...browser.webpack.common,
            ...getServices(modules, 'configuration'),
            ...getServices(destinations, 'destination/scrobble'),
            'neon-extension-core/modules/background/messaging/services/scrobble'
        ],

        //
        // Configuration
        //

        'configuration/configuration': [
            // Ensure CSS Dependencies are bundled first
            'neon-extension-core/modules/configuration/dependencies.scss',

            ...browser.webpack.common,
            ...getServices(modules, 'configuration', { includeComponents: true }),
            'neon-extension-core/modules/configuration'
        ],

        //
        // Destinations
        //

        ...Object.assign({}, ...destinations.map((module) => {
            return createModuleChunks(browser, module) || {};
        })),

        //
        // Sources
        //

        ...Object.assign({}, ...sources.map((module) => {
            return {
                ...createModule(browser, environment, module),
                ...createModuleChunks(browser, module)
            };
        }))
    };
}
