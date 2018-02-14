import Filesystem from 'fs-extra';
import IsPlainObject from 'lodash/isPlainObject';
import Merge from 'lodash/merge';
import Path from 'path';
import Pick from 'lodash/pick';

import Git from './git';
import Travis from './travis';
import {readPackageDetails} from './package';


function parseExtensionManifest(name, data) {
    return Merge({
        'title': data.name || null,

        'origins': [],
        'permissions': [],

        'optional_origins': [],
        'optional_permissions': [],

        'modules': {
            'destinations': [],
            'sources': []
        }
    }, {
        ...data,

        'modules': {
            ...data.modules,

            'core': [
                'neon-extension-core',
                'neon-extension-framework'
            ],

            'browsers': [
                'neon-extension-browser-base',
                ...data.modules.browsers
            ],

            'packages': [
                name
            ]
        }
    });
}

function readExtensionManifest(path, name) {
    // Read extension manifest from file
    return Filesystem.readJson(Path.join(path, 'extension.json')).then((data) => {
        if(!IsPlainObject(data)) {
            return Promise.reject(new Error(
                'Expected manifest to be a plain object'
            ));
        }

        // Parse extension manifest
        return parseExtensionManifest(name, data);
    }, () => {
        // Return default extension manifest
        return parseExtensionManifest(name, {});
    });
}

export function resolve(path, name) {
    return Promise.resolve({})
        // Resolve package details
        .then((extension) => readPackageDetails(path).then((pkg) => ({
            ...extension,
            ...pkg,

            package: pkg
        })))
        // Resolve repository status
        .then((extension) => Git.status(path, extension.package.version).catch(() => ({
            ahead: 0,
            dirty: false,

            branch: null,
            commit: null,

            tag: null,
            latestTag: null
        })).then((repository) => ({
            ...extension,

            // Override attributes
            ...Pick(repository, [
                'branch',
                'commit',

                'tag',
                'latestTag'
            ]),

            // Include repository status
            repository
        })))
        // Resolve travis status
        .then((extension) => Promise.resolve(Travis.status()).then((travis) => ({
            ...extension,

            // Override attributes
            ...Pick(travis, [
                'branch',
                'commit',
                'tag'
            ]),

            // Include travis status
            travis
        })))
        // Resolve extension manifest
        .then((extension) => readExtensionManifest(path, name).then((manifest) => ({
            ...extension,
            ...manifest,

            manifest
        })));
}

export default {
    resolve
};
