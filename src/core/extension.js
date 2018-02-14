import CloneDeep from 'lodash/cloneDeep';
import IsNil from 'lodash/isNil';
import IsPlainObject from 'lodash/isPlainObject';
import Merge from 'lodash/merge';
import Path from 'path';
import Pick from 'lodash/pick';

import Git from './git';
import Json from './json';
import Travis from './travis';
import {readPackageDetails} from './package';


function getBuildChannel({dirty, tag}) {
    if(dirty || IsNil(tag)) {
        return 'develop';
    }

    if(tag.indexOf('beta') >= 0) {
        return 'beta';
    }

    return 'stable';
}

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
        ...CloneDeep(data),

        'modules': {
            ...CloneDeep(data.modules),

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

function readExtensionManifest(extension, path) {
    return Promise.resolve({})
        // Read extension manifest
        .then((manifest) =>
            Json.read(Path.join(path, 'extension.json'), {}).then((data) => ({
                ...manifest,
                ...data
            }))
        )
        // Overlay with channel manifest
        .then((manifest) =>
            Json.read(Path.join(path, `extension.${extension.channel}.json`), {}).then((data) => ({
                ...manifest,
                ...data
            }))
        )
        // Parse extension manifest
        .then((manifest) => {
            if(!IsPlainObject(manifest)) {
                return Promise.reject(new Error(
                    'Expected manifest to be a plain object'
                ));
            }

            return parseExtensionManifest(extension.name, manifest);
        }, () => {
            return parseExtensionManifest(extension.name, {});
        });
}

export function resolve(path, name) {
    return Promise.resolve({})
        // Resolve package details
        .then((extension) => readPackageDetails(path).then((pkg) => {
            if(pkg.name !== name) {
                return Promise.reject(new Error(
                    `Invalid package: ${pkg.name} (expected: ${name})`
                ));
            }

            return {
                ...extension,
                ...pkg,

                package: pkg
            };
        }))
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
        // Resolve build channel
        .then((result) => ({
            ...result,

            channel: getBuildChannel(result)
        }))
        // Resolve extension manifest
        .then((extension) => readExtensionManifest(extension, path).then((manifest) => ({
            ...extension,
            ...manifest,

            manifest
        })));
}

export default {
    resolve
};
