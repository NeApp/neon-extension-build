import Filesystem from 'fs-extra';
import IsPlainObject from 'lodash/isPlainObject';
import Merge from 'lodash/merge';
import Path from 'path';
import Without from 'lodash/without';
import ForEach from 'lodash/forEach';
import Filter from 'lodash/filter';
import Values from 'lodash/values';


export function orderModules(modules) {
    let result = [];

    ForEach([
        'neon-extension-build',
        'neon-extension-framework',
        'neon-extension-core'
    ], (name) => {
        if(modules.indexOf(name) < 0) {
            return;
        }

        result.push(name);
    });

    // Append remaining modules
    return result.concat(Without(modules, ...result));
}

export function getBrowserModules(browser) {
    return [
        browser.modules['neon-extension-build'],
        browser.modules['neon-extension-framework'],
        browser.modules['neon-extension-core'],

        ...Filter(Values(browser.modules), (module) => [
            'neon-extension-build',
            'neon-extension-framework',
            'neon-extension-core'
        ].indexOf(module.name) < 0)
    ];
}

export function getPackageModules(path) {
    return Filesystem.readJson(path).then((pkg) => {
        if(pkg.name.indexOf('neon-extension-') !== 0) {
            return Promise.reject(new Error(`Invalid module: ${pkg.name}`));
        }

        return orderModules(Filter([
            ...Object.keys(pkg.dependencies || {}),
            ...Object.keys(pkg.peerDependencies || {})
        ], (name) =>
            name.indexOf('neon-extension-') === 0
        ));
    });
}

function parsePackageDetails(data) {
    return Merge({
        name: null,
        version: null,
        description: null,
        keywords: null,

        homepage: null,
        author: null,
        license: null,

        main: null,
        private: null,

        bugs: null,
        engines: null,
        repository: null,

        dependencies: {},
        devDependencies: {},
        peerDependencies: {},

        bin: null,
        scripts: null
    }, data);
}

export function readPackageDetails(path) {
    // Read package details from file
    return Filesystem.readJson(Path.join(path, 'package.json')).then((data) => {
        if(!IsPlainObject(data)) {
            return Promise.reject(new Error(
                'Expected manifest to be a plain object'
            ));
        }

        // Parse package details
        return parsePackageDetails(data);
    });
}

export default {
    getBrowserModules,
    getPackageModules,
    orderModules,

    readPackageDetails
};
