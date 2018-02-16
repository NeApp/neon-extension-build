import CloneDeep from 'lodash/cloneDeep';
import IsNil from 'lodash/isNil';
import Merge from 'lodash/merge';
import Path from 'path';

import Environments from './constants/environments';


function getBuildPath(environment, browser, options) {
    if(browser.local) {
        return Path.join(options['build-dir'], environment.name);
    }

    return Path.join(options['build-dir'], browser.name, environment.name);
}

function resolveEnvironment(environment, browser, options) {
    let buildPath = getBuildPath(environment, browser, options);

    return Merge(CloneDeep(environment), {
        output: {
            source: Path.join(buildPath, 'source')
        },

        outputPath: Path.join(buildPath, 'unpacked'),
        buildPath,

        builderPath: Path.resolve(__dirname, '../../'),
        packagePath: options['package-dir'],

        options,
        tasks: {},

        webpack: {
            extracted: {}
        }
    });
}

export function resolve(name, browser, options) {
    if(!IsNil(Environments[name])) {
        return resolveEnvironment(Environments[name], browser, options);
    }

    throw new Error(`Invalid environment: "${name}"`);
}

export default {
    resolve
};
