import Filesystem from 'fs-extra';
import Filter from 'lodash/filter';
import IsNil from 'lodash/isNil';
import IsPlainObject from 'lodash/isPlainObject';
import Merge from 'lodash/merge';
import Path from 'path';


export function getPackageModules(path) {
    return Filesystem.readJson(path).then((pkg) => {
        let match = /^neon-extension-(\w+)$/.exec(pkg.name);

        if(IsNil(match) || ['build', 'core', 'framework'].indexOf(match[1]) >= 0) {
            return Promise.reject(new Error(
                `Invalid package: ${pkg.name} (expected current directory to contain a browser package)`
            ));
        }

        // Find package modules
        let modules = Filter(Object.keys(pkg.dependencies), (name) =>
            name.indexOf('neon-extension-') === 0 && [
                'neon-extension-build',
                'neon-extension-core',
                'neon-extension-framework'
            ].indexOf(name) < 0
        );

        // Return ordered modules
        return [
            'neon-extension-framework',
            'neon-extension-core',

            ...modules
        ];
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
    getPackageModules,
    readPackageDetails
};
