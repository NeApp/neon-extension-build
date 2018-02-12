import Filesystem from 'fs-extra';
import IsPlainObject from 'lodash/isPlainObject';
import Merge from 'lodash/merge';
import Path from 'path';
import Pick from 'lodash/pick';

import Git from './git';
import Travis from './travis';
import Version from './version';
import {readPackageDetails} from './package';


export function resolve(packageDir, packageName) {
    let packagePath = Path.join(packageDir, 'Packages', packageName);

    return Promise.resolve({})
        // Resolve package details
        .then((extension) => readPackageDetails(packagePath).then((pkg) => ({
            ...extension,
            ...pkg,

            package: pkg
        })))
        // Resolve repository status
        .then((extension) => Git.status(packagePath, extension.package.version).catch(() => ({
            ahead: 0,
            dirty: false,

            branch: null,
            commit: null,
            tag: null
        })).then((repository) => ({
            ...extension,

            // Override attributes
            ...Pick(repository, [
                'branch',
                'commit',
                'tag'
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
        .then((extension) => readExtensionManifest(packageName, packagePath).then((manifest) => ({
            ...extension,
            ...manifest,

            manifest
        })));
}

function readExtensionManifest(packageName, path) {
    // Read extension manifest from file
    return Filesystem.readJson(Path.join(path, 'extension.json')).then((data) => {
        if(!IsPlainObject(data)) {
            return Promise.reject(new Error(
                'Expected manifest to be a plain object'
            ));
        }

        // Parse extension manifest
        return parseExtensionManifest(packageName, data)
    }, () => {
        // Return default extension manifest
        return parseExtensionManifest(packageName, {});
    });
}

function parseExtensionManifest(packageName, data) {
    return Merge({
        title: data.name || null,

        origins: [],
        permissions: [],

        optional_origins: [],
        optional_permissions: [],

        modules: {
            destinations: [],
            sources:      []
        }
    }, {
        ...data,

        modules: {
            ...data.modules,

            core: [
                'neon-extension-core',
                'neon-extension-framework'
            ],

            browsers: [
                'neon-extension-browser-base',
                ...data.modules.browsers
            ],

            packages: [
                packageName
            ]
        }
    });
}

export default {
    resolve
};
