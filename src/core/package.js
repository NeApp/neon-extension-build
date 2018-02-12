import Filesystem from 'fs-extra';
import IsPlainObject from 'lodash/isPlainObject';
import Merge from 'lodash/merge';
import Path from 'path';


function parsePackageDetails(data) {
    return Merge({
        name: null,
        version: null,

        dependencies: {},
        devDependencies: {},
        peerDependencies: {}
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
