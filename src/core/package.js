import Filesystem from 'fs-extra';
import IsPlainObject from 'lodash/isPlainObject';
import Merge from 'lodash/merge';
import Path from 'path';


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
    }, () => {
        // Return default package details
        return parsePackageDetails({});
    });
}

export default {
    readPackageDetails
};
