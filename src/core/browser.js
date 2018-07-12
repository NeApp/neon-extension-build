import CloneDeep from 'lodash/cloneDeep';
import Filesystem from 'fs-extra';
import Find from 'lodash/find';
import IsNil from 'lodash/isNil';
import Merge from 'lodash/merge';
import Path from 'path';

import Browsers from './constants/browsers';
import Extension from './extension';
import Version from './version';
import Vorpal from './vorpal';


const Logger = Vorpal.logger;

export function findBrowser(basePath, browser) {
    if(Filesystem.existsSync(Path.join(basePath, 'extension.json'))) {
        return {
            local: true,
            path: basePath
        };
    }

    // Find development package directory
    let path = Path.join(basePath, 'Packages');

    if(!Filesystem.existsSync(path)) {
        throw new Error(
            'Invalid package directory (expected development root directory, or browser package directory)'
        );
    }

    // Find development package
    path = Path.join(path, browser.repository);

    if(!Filesystem.existsSync(path)) {
        throw new Error(`Unable to find "${browser.repository}" repository`);
    }

    return {
        local: false,
        path
    };
}

export function getBrowser(name) {
    return Find(Browsers, (browser) => (
        browser.name === name ||
        browser.package === name
    ));
}

export function isBrowser(name) {
    return !IsNil(getBrowser(name));
}

function resolveFeatures(features) {
    return Merge({
        contentScripts: 'static',
        permissions: 'static'
    }, features);
}

export function getBrowsers(name) {
    if(name === 'all') {
        return Object.values(Browsers);
    }

    if(!IsNil(Browsers[name])) {
        return [Browsers[name]];
    }

    throw new Error(`Invalid browser: "${name}"`);
}

export function resolve(packageDir, browser) {
    Logger.info(`Resolving browser "${browser.name}"`);

    return Promise.resolve(CloneDeep(browser))
        .then((browser) => ({
            ...browser,
            ...findBrowser(packageDir, browser)
        }))
        // Resolve extension
        .then((browser) => Extension.resolve(packageDir, browser).then((extension) => ({
            ...browser,

            features: resolveFeatures(extension.features),
            modules: extension.modules,
            extension
        })))
        // Resolve browser version
        .then((browser) => ({
            ...browser,
            ...Version.resolveBrowser(browser)
        }));
}

export default {
    getBrowsers,
    resolve
};
