import Filesystem from 'fs-extra';
import ForEach from 'lodash/forEach';
import IsNil from 'lodash/isNil';
import IsPlainObject from 'lodash/isPlainObject';
import KeyBy from 'lodash/keyBy';
import Merge from 'lodash/merge';
import Omit from 'lodash/omit';
import Path from 'path';
import Pick from 'lodash/pick';
import Reduce from 'lodash/reduce';
import Uniq from 'lodash/uniq';

import Git from './git';
import Version from './version';
import {readPackageDetails} from './package';


const ModuleType = {
    'core': {
        name: 'core'
    },
    'tool': {
        name: 'tool',
        directory: 'Tools/'
    },

    'packages': {
        name: 'package',
        directory: 'Packages/'
    },

    'destinations': {
        name: 'destination',
        directory: 'Destinations/'
    },
    'sources': {
        name: 'source',
        directory: 'Sources/'
    }
};

function getModulePath(basePath, name, type) {
    let path;

    // Find development module type directory
    path = Path.join(basePath, (type.directory || '') + name);

    if(Filesystem.existsSync(path)) {
        return path;
    }

    // Find browser package
    if(type.name === 'package' && Filesystem.existsSync(basePath, 'extension.json')) {
        return basePath;
    }

    // Find installed module
    path = Path.join(basePath, 'node_modules', name);

    if(Filesystem.existsSync(path)) {
        return path;
    }

    throw new Error(`Unable to find "${name}" module`);
}

function readContributors(path) {
    // Read contributors from file
    return Filesystem.readJson(Path.join(path, 'contributors.json')).then((data) => {
        if(!Array.isArray(data)) {
            return Promise.reject(new Error(
                'Expected contributors to be an array'
            ));
        }

        return data;
    }, () => ([]));
}

function getContentScriptOrigins(contentScripts) {
    return Reduce(contentScripts, (result, contentScript) => {
        ForEach(contentScript.matches, (origin) => {
            if(IsNil(origin)) {
                throw new Error(`Invalid content script origin: ${origin}`);
            }

            // Include origin in result
            result.push(origin);
        });

        return result;
    }, []);
}

function parseModuleManifest(extension, data) {
    let manifest = Merge({
        'title': data.name || null,
        'icons': {},

        'content_scripts': [],
        'web_accessible_resources': [],

        'origins': [],
        'permissions': [],

        'optional_origins': [],
        'optional_permissions': [],

        'webpack': {
            'alias': [],
            'babel': [],
            'chunks': [],
            'modules': []
        }
    }, data);

    // Include content script origins
    if(extension.features.contentScripts === 'dynamic') {
        manifest['origins'] = manifest['origins'].concat(getContentScriptOrigins(manifest['content_scripts']));
    }

    // Remove duplicate origins
    manifest.origins = Uniq(manifest.origins);

    // Remove duplicate permissions
    manifest.permissions = Uniq(manifest.permissions);

    return manifest;
}

function readModuleManifest(extension, path) {
    // Read module manifest from file
    return Filesystem.readJson(Path.join(path, 'module.json')).then((data) => {
        if(!IsPlainObject(data)) {
            return Promise.reject(new Error(
                'Expected manifest to be a plain object'
            ));
        }

        // Parse module manifest
        return parseModuleManifest(extension, data);
    }, () => {
        // Return default module manifest
        return parseModuleManifest(extension, {});
    });
}

export function resolve(extension, path, type, name) {
    let moduleType = ModuleType[type];

    if(IsNil(moduleType)) {
        return Promise.reject(new Error(
            `Unknown module type: "${type}"`
        ));
    }

    // Build module key
    let key = name.substring(name.lastIndexOf('-') + 1);

    if(key.length < 1) {
        return Promise.reject(new Error(
            `Invalid module name: "${name}"`
        ));
    }

    // Build module
    let module = {
        key,
        type: moduleType.name,
        path: getModulePath(path, name, moduleType)
    };

    // Resolve module metadata
    return Promise.resolve(module)
        .then((module) => readPackageDetails(module.path).then((pkg) => ({
            ...module,

            // Extension
            ...Omit(pkg, [
                'repository'
            ]),

            // Package
            package: pkg
        })))
        // Resolve repository status
        .then((module) => Promise.resolve().then(() => {
            if(module.type === 'package') {
                return extension.repository;
            }

            return Git.status(module.path, module.package.version).catch(() => ({
                ahead: 0,
                dirty: false,

                branch: null,
                commit: null,

                tag: null,
                latestTag: null
            }));
        }).then((repository) => ({
            ...module,

            // Module
            ...Pick(repository, [
                'branch',
                'commit',

                'tag',
                'latestTag'
            ]),

            // Repository
            repository
        })))
        // Resolve travis status (for package modules)
        .then((module) => {
            if(module.type !== 'package') {
                return module;
            }

            return {
                ...module,

                // Module
                ...Pick(extension.travis, [
                    'branch',
                    'commit',
                    'tag'
                ]),

                // Travis
                travis: extension.travis
            };
        })
        // Resolve contributors
        .then((module) => readContributors(module.path).then((contributors) => ({
            ...module,

            contributors
        })))
        // Resolve module manifest
        .then((module) => readModuleManifest(extension, module.path).then((manifest) => ({
            ...module,
            ...manifest,

            manifest: manifest
        })))
        // Resolve version
        .then((module) => ({
            ...module,
            ...Version.resolve(module)
        }));
}

export function resolveMany(path, extension) {
    // Resolve each module
    return Promise.all(Reduce(extension.modules, (promises, names, type) => {
        promises.push(resolve(extension, path, 'tool', 'neon-extension-build'));

        // Add enabled modules
        ForEach(names, (name) => {
            promises.push(resolve(extension, path, type, name));
        });

        return promises;
    }, [])).then((modules) => {
        return KeyBy(modules, 'name');
    });
}

export default {
    resolve,
    resolveMany
};
