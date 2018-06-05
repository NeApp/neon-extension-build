import Chalk from 'chalk';
import Filesystem from 'fs';
import Filter from 'lodash/filter';
import ForEach from 'lodash/forEach';
import IsNil from 'lodash/isNil';
import IsString from 'lodash/isString';
import Map from 'lodash/map';
import Merge from 'lodash/merge';
import Path from 'path';
import SortBy from 'lodash/sortBy';

import Vorpal from '../core/vorpal';
import {Services, ServiceIds, ServiceOptions} from '../core/constants';
import {resolvePath} from '../core/helpers/path';


const Logger = Vorpal.logger;

function parseServiceId(id) {
    let name = null;
    let type = null;

    // Ensure service exists
    if(ServiceIds.indexOf(id) < 0) {
        return { name, type };
    }

    // Split service identifier into name and type
    let parts = id.split(':');

    if(parts.length === 1) {
        name = parts[0];
    } else if(parts.length === 2) {
        name = parts[1];
        type = parts[0];
    } else {
        throw new Error(`Invalid service identifier: ${id}`);
    }

    return { name, type };
}

function getServices(modules, id, options) {
    options = Merge({
        includeComponents: false
    }, options);

    // Parse service identifier
    let {name} = parseServiceId(id);

    if(IsNil(name)) {
        throw new Error(`Unknown service: ${id}`);
    }

    // Find matching services
    let items = [];

    ForEach(SortBy(modules, 'name'), (module) => {
        // Ensure module has services
        if(typeof module.services === 'undefined') {
            return;
        }

        // Ensure module has the specified service
        if(module.services.indexOf(id) === -1) {
            return;
        }

        // Resolve service path
        let servicePath = resolvePath([
            Path.resolve(module.path, `Services/${name}/${name}.js`),
            Path.resolve(module.path, `Services/${name}.js`)
        ]);

        if(IsNil(servicePath)) {
            Logger.error(Chalk.red(`Unable to find "${name}" service for "${module.name}"`));
            return;
        }

        // Include service
        items.push(servicePath);

        // Include components (if enabled)
        // TODO Scan directory, and include components individually
        let componentsPath = Path.resolve(module.path, `Components/${name}/index.js`);

        if(Filesystem.existsSync(componentsPath) && options.includeComponents) {
            items.push(componentsPath);
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

    // Retrieve framework module
    let framework = browser.modules['neon-extension-framework'];

    // Find module services
    let items = [];

    for(let i = 0; i < module.services.length; i++) {
        let id = module.services[i];

        // Parse service identifier
        let {name, type} = parseServiceId(id);

        if(IsNil(name)) {
            Logger.error(Chalk.red(`Unknown service "${name}" for "${module.name}"`));
            continue;
        }

        // Ignore excluded services
        if(ServiceOptions[id] && ServiceOptions[id].include === false) {
            continue;
        }

        // Resolve service path
        let servicePath = resolvePath([
            Path.resolve(module.path, `Services/${name}/${name}.js`),
            Path.resolve(module.path, `Services/${name}.js`)
        ]);

        if(IsNil(servicePath)) {
            Logger.error(Chalk.red(`Unable to find "${name}" service for "${module.name}"`));
            continue;
        }

        // Only include the plugin configuration service
        if(id === Services.Configuration) {
            items.push(servicePath);
            continue;
        }

        // Resolve bootstrap path
        let mainPath = resolvePath([
            Path.resolve(framework.path, `Bootstrap/${type}/${name}/${name}.js`),
            Path.resolve(framework.path, `Bootstrap/${type}/${name}.js`)
        ]);

        if(IsNil(mainPath)) {
            Logger.error(Chalk.red(
                `Unable to find "${type}/${name}" bootstrap module for the "${name}" service`
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
    return {
        [`Modules/${module.name}/Main`]: [
            ...browser.webpack.common,
            ...getServices([browser.modules['neon-extension-core']], Services.Configuration),
            ...getModuleServices(browser, environment, module)
        ]
    };
}

function createModuleChunks(browser, module) {
    if(typeof module === 'undefined' || module === null) {
        Logger.error(Chalk.red(`Invalid value provided for the "module" parameter: ${module}`));
        return null;
    }

    if(typeof module.name === 'undefined' || module.name === null) {
        Logger.error(Chalk.red(`Invalid value provided for the "module" parameter: ${module}`));
        return null;
    }

    if(!IsNil(module.webpack.chunks)) {
        Logger.error(Chalk.red(`Unsupported option "webpack.chunks" found for ${module.name}`));
        return null;
    }

    // Create module chunks
    let result = {};

    ForEach(module.webpack.modules || {}, ({ modules }, name) => {
        if(!IsString(name) || name.length < 1) {
            Logger.warn(Chalk.yellow(`Ignoring module with an invalid name "${name}" for ${module.name}`));
            return;
        }

        // Ensure an array of modules have been provided
        if(!Array.isArray(modules) || modules.length < 1) {
            Logger.warn(Chalk.yellow(`Ignoring invalid module definition "${name}" for ${module.name}`));
            return;
        }

        // Create module
        result[`Modules/${module.name}/${name}`] = [
            ...browser.webpack.common,

            // Include modules (with module prefix)
            ...Map(modules, (name) =>
                Path.resolve(module.path, `${name}`)
            )
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
        'Background/Messaging': [
            ...browser.webpack.common,
            ...getServices(modules, Services.Configuration),

            'neon-extension-core/Messaging'
        ],

        //
        // Services
        //

        'Background/Services/App': [
            ...browser.webpack.common,
            ...getServices(modules, Services.Configuration),

            'neon-extension-core/Services/App'
        ],

        'Background/Services/ContentScript': [
            ...browser.webpack.common,
            ...getServices(modules, Services.Configuration),

            'neon-extension-core/Services/ContentScript'
        ],

        'Background/Services/Library': [
            ...browser.webpack.common,
            ...getServices(modules, Services.Configuration),

            'neon-extension-core/Services/Library'
        ],

        'Background/Services/Migrate': [
            ...browser.webpack.common,
            ...getServices(modules, Services.Configuration),
            ...getServices(modules, Services.Migrate),

            'neon-extension-core/Services/Migrate'
        ],

        'Background/Services/Scrobble': [
            ...browser.webpack.common,
            ...getServices(modules, Services.Configuration),
            ...getServices(destinations, Services.Destination.Scrobble),

            'neon-extension-core/Services/Scrobble'
        ],

        //
        // Application
        //

        'Application': [
            // Ensure CSS Dependencies are bundled first
            'neon-extension-core/App/App.Dependencies.scss',

            // Include common modules
            ...browser.webpack.common,

            // Include configuration services
            ...getServices(modules, Services.Configuration, { includeComponents: true }),

            // Bootstrap
            'neon-extension-core/App'
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
