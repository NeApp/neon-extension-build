import CloneDeep from 'lodash/cloneDeep';
import IsNil from 'lodash/isNil';
import Merge from 'lodash/merge';
import Path from 'path';

import Environments from './constants/environments';


export function resolve(name, browser, options) {
    if(!IsNil(Environments[name])) {
        return resolveEnvironment(Environments[name], browser, options);
    }

    throw new Error('Invalid environment: "' + name + '"');
}

function resolveEnvironment(environment, browser, options) {
    let buildPath = Path.join(options['build-dir'], browser.name, environment.name);

    return Merge(CloneDeep(environment), {
        outputPath: Path.join(buildPath, 'unpacked'),
        buildPath,

        packagePath: options['package-dir'],

        options,
        tasks: {},

        webpack: {
            extracted: {}
        }
    });
}

export default {
    resolve
};
