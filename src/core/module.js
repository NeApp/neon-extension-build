import Filesystem from 'fs-extra';
import ForEach from 'lodash/forEach';
import IsNil from 'lodash/isNil';
import IsPlainObject from 'lodash/isPlainObject';
import KeyBy from 'lodash/keyBy';
import Merge from 'lodash/merge';
import Path from 'path';
import Pick from 'lodash/pick';
import Reduce from 'lodash/reduce';

import Git from './git';
import Version from './version';
import {readPackageDetails} from './package';


const ModuleType = {
    'core': {
        name: 'core'
    },

    'browsers': {
        name: 'browser',
        directory: 'Browsers/'
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

export function resolve(packageDir, type, name) {
    let moduleType = ModuleType[type];

    if(IsNil(moduleType)) {
        return Promise.reject(new Error(
            'Unknown module type: "' + type + '"'
        ));
    }

    // Build module key
    let key = name.substring(name.lastIndexOf('-') + 1);

    if(key.length < 1) {
        return Promise.reject(new Error(
            'Invalid module name: "' + name + '"'
        ));
    }

    // Build module
    let module = {
        key,
        type: moduleType.name,
        path: Path.join(packageDir, (moduleType.directory || '') + name)
    };

    // Resolve module metadata
    return Promise.resolve(module)
        .then((module) => readPackageDetails(module.path).then((pkg) => ({
            ...module,
            ...pkg,

            package: pkg
        })))
        // Resolve repository status
        .then((module) => Git.status(module.path, module.package.version).catch(() => ({
            ahead: 0,
            dirty: false,

            branch: null,
            commit: null,
            tag: null
        })).then((repository) => ({
            ...module,

            ...Pick(repository, [
                'branch',
                'commit',
                'tag'
            ]),

            repository
        })))
        // Resolve contributors
        .then((module) => readContributors(module.path).then((contributors) => ({
            ...module,

            contributors
        })))
        // Resolve module manifest
        .then((module) => readModuleManifest(module.path).then((manifest) => ({
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

export function resolveMany(packageDir, modules) {
    // Resolve each module
    return Promise.all(Reduce(modules, (promises, names, type) => {
        ForEach(names, (name) => {
            promises.push(resolve(packageDir, type, name));
        });

        return promises;
    }, [])).then((modules) => {
        return KeyBy(modules, 'name');
    });
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

function readModuleManifest(path) {
    // Read module manifest from file
    return Filesystem.readJson(Path.join(path, 'module.json')).then((data) => {
        if(!IsPlainObject(data)) {
            return Promise.reject(new Error(
                'Expected manifest to be a plain object'
            ));
        }

        // Parse module manifest
        return parseModuleManifest(data)
    }, () => {
        // Return default module manifest
        return parseModuleManifest({});
    });
}

function parseModuleManifest(data) {
    return Merge({
        title: data.name || null,
        icons: {},

        content_scripts: [],
        web_accessible_resources: [],

        origins: [],
        permissions: [],

        optional_origins: [],
        optional_permissions: [],

        webpack: {
            alias: [],
            babel: [],
            chunks: [],
            modules: [],
        }
    }, data);
}

export default {
    resolve,
    resolveMany
};
