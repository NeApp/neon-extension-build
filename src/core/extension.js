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
import PadEnd from 'lodash/padEnd';


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

function parseExtensionManifest(name, data) {
    return Merge(CloneDeep(BaseManifest), {
        ...CloneDeep(data),

        'modules': {
            ...CloneDeep(data.modules),

            'core': [
                'neon-extension-core',
                'neon-extension-framework'
            ],

            'packages': [
                name
            ]
        }
    });
}

function readExtensionManifest(extension, path, channel = null) {
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

function getExtensionManifest(extension, path) {
    return readExtensionManifest(extension, path).then(
        (manifest) => parseExtensionManifest(extension.name, manifest),
        () => parseExtensionManifest(extension.name, {})
    );
}

function overlayExtensionManifest(extension, path) {
    return readExtensionManifest(extension, path, extension.channel).then((manifest) => {
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

function getBuildManifest(path) {
    return Json.read(Path.join(path, 'build.json'), {}).then((manifest) => {
        if(!IsPlainObject(manifest)) {
            return Promise.reject(new Error(
                'Expected build manifest to be a plain object'
            ));
        }

        return manifest;
    });
}

export function resolve(packageDir, path, name) {
    return Promise.resolve({ type: 'package', path })
        // Resolve package details
        .then((extension) => readPackageDetails(path).then((pkg) => {
            if(pkg.name !== name) {
                return Promise.reject(new Error(
                    `Invalid package: ${pkg.name} (expected: ${name})`
                ));
            }

            return {
                ...extension,

                // Extension
                ...Omit(pkg, [
                    'repository'
                ]),

                // Package
                package: pkg
            };
        }))
        // Resolve extension manifest
        .then((extension) => getExtensionManifest(extension, path).then((manifest) => ({
            ...extension,
            ...manifest,

            manifest
        })))
        // Resolve build manifest
        .then((extension) => getBuildManifest(path).then((build) => ({
            ...extension,

            build
        })))
        // Resolve repository status
        .then((extension) => Promise.resolve().then(() => {
            if(!IsNil(extension.repository)) {
                return extension.repository;
            }

            // Return repository status from the build manifest
            if(!IsNil(extension.build[name])) {
                if(!IsNil(extension.build[name].repository)) {
                    return extension.build[name].repository;
                }

                Logger.warn(Chalk.yellow(
                    `[${PadEnd(name, 40)}] No repository status available in the build manifest`
                ));
            }

            // Resolve repository status
            return Git.status(path, extension.package.version).catch(() => ({
                ahead: 0,
                dirty: false,

                branch: null,
                commit: null,

                tag: null,
                latestTag: null
            }));
        }).then((repository) => ({
            ...extension,

            // Extension
            ...Pick(repository, [
                'branch',
                'commit',

                'tag',
                'latestTag'
            ]),

            // Repository
            repository
        })))
        // Resolve travis status
        .then((extension) => Promise.resolve().then(() => {
            if(!IsNil(extension.travis)) {
                return extension.travis;
            }

            // Return travis status from the build manifest
            if(!IsNil(extension.build[name])) {
                if(!IsNil(extension.build[name].travis)) {
                    return extension.build[name].travis;
                }

                Logger.warn(Chalk.yellow(
                    `[${PadEnd(name, 40)}] No travis status available in the build manifest`
                ));
            }

            // Resolve travis status
            return Travis.status();
        }).then((travis) => ({
            ...extension,

            // Extension
            ...Pick(travis, [
                'branch',
                'commit',
                'tag'
            ]),

            // Travis
            travis
        })))
        // Resolve modules
        .then((extension) => Module.resolveMany(packageDir, extension).then((modules) => ({
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
        .then((extension) => overlayExtensionManifest(extension, path).then((manifest) => ({
            ...extension,

            // Extension
            ...Omit(manifest, [
                'modules'
            ]),

            // Manifest
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
