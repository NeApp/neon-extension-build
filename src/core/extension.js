import Chalk from 'chalk';
import CloneDeep from 'lodash/cloneDeep';
import IsNil from 'lodash/isNil';
import IsPlainObject from 'lodash/isPlainObject';
import Merge from 'lodash/merge';
import Omit from 'lodash/omit';
import Path from 'path';
import Pick from 'lodash/pick';

import Git from './git';
import Json from './json';
import Module from './module';
import Travis from './travis';
import Vorpal from './vorpal';
import {readPackageDetails} from './package';


const Logger = Vorpal.logger;

const BaseManifest = {
    'title': null,

    'origins': [],
    'permissions': [],

    'optional_origins': [],
    'optional_permissions': [],

    'modules': {
        'destinations': [],
        'sources': []
    }
};

function getBuildChannel({dirty, tag}) {
    if(dirty || IsNil(tag)) {
        return 'develop';
    }

    if(tag.indexOf('beta') >= 0) {
        return 'beta';
    }

    return 'stable';
}

function isDirty({repository, modules}) {
    if(repository.dirty) {
        return true;
    }

    for(let name in modules) {
        if(!modules.hasOwnProperty(name)) {
            continue;
        }

        if(modules[name].repository.dirty) {
            return true;
        }
    }

    return false;
}

function parseManifest(name, data) {
    return Merge(CloneDeep(BaseManifest), {
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

function readManifest(extension, path, channel = null) {
    let name = 'extension.json';

    if(!IsNil(channel)) {
        name = `extension.${channel}.json`;
    }

    // Read manifest from file
    return Json.read(Path.join(path, name), {}).then((manifest) => {
        if(!IsPlainObject(manifest)) {
            return Promise.reject(new Error(
                'Expected manifest to be a plain object'
            ));
        }

        return manifest;
    }, () => (
        {}
    ));
}

function getManifest(extension, path) {
    return readManifest(extension, path).then(
        (manifest) => parseManifest(extension.name, manifest),
        () => parseManifest(extension.name, {})
    );
}

function overlayManifest(extension, path) {
    return readManifest(extension, path, extension.channel).then((manifest) => {
        if(!IsNil(manifest.modules)) {
            return Promise.reject(new Error(
                '"modules" in manifest overlays are not permitted'
            ));
        }

        return {
            ...extension.manifest,
            ...manifest
        };
    });
}

export function resolve(packageDir, path, name) {
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
        // Resolve extension manifest
        .then((extension) => getManifest(extension, path).then((manifest) => ({
            ...extension,
            ...manifest,

            manifest
        })))
        // Resolve modules
        .then((extension) => Module.resolveMany(packageDir, extension.modules).then((modules) => ({
            ...extension,

            modules
        })))
        // Resolve extension "dirty" state
        .then((extension) => ({
            ...extension,

            dirty: isDirty(extension)
        }))
        // Resolve build channel
        .then((extension) => ({
            ...extension,

            channel: getBuildChannel(extension)
        }))
        // Resolve extension manifest overlay
        .then((extension) => overlayManifest(extension, path).then((manifest) => ({
            ...extension,

            ...Omit(manifest, [
                'modules'
            ]),

            manifest
        })))
        // Display extension details
        .then((extension) => {
            Logger.info(`"${Chalk.green(extension.manifest.title)}" [${Chalk.green(extension.name)}]`);
            Logger.info(` - ${Chalk.cyan('Branch')}: ${extension.branch}`);
            Logger.info(` - ${Chalk.cyan('Channel')}: ${extension.channel}`);
            Logger.info(` - ${Chalk.cyan('Commit:')} ${extension.commit}`);
            Logger.info(` - ${Chalk.cyan('Dirty')}: ${extension.dirty}`);
            Logger.info(` - ${Chalk.cyan('Tag / Current')}: ${extension.tag}`);
            Logger.info(` - ${Chalk.cyan('Tag / Latest')}: ${extension.latestTag}`);

            return extension;
        });
}

export default {
    resolve
};
