import CloneDeep from 'lodash/cloneDeep';
import Filesystem from 'fs-extra';
import IsNil from 'lodash/isNil';
import Path from 'path';

import Browsers from './constants/browsers';
import Extension from './extension';
import Version from './version';


function findBrowser(basePath, browser) {
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
    path = Path.join(path, browser.package);

    if(!Filesystem.existsSync(path)) {
        throw new Error(`Unable to find "${browser.name}" browser package`);
    }

    return {
        local: false,
        path
    };
}

function resolveBrowser(packageDir, browser) {
    return Promise.resolve(CloneDeep(browser))
        .then((browser) => ({
            ...browser,
            ...findBrowser(packageDir, browser)
        }))
        // Resolve extension
        .then((browser) => Extension.resolve(packageDir, browser.path, browser.package).then((extension) => ({
            ...browser,

            modules: extension.modules,
            extension
        })))
        // Retrieve supported browser features
        .then((browser) => ({
            ...browser,

            supports: browser.modules[`neon-extension-browser-${browser.name}`].browser
        }))
        // Resolve browser version
        .then((browser) => ({
            ...browser,
            ...Version.resolveBrowser(browser)
        }));
}

export function resolve(packageDir, name) {
    let browsers;

    if(name === 'all') {
        browsers = Object.values(Browsers);
    } else if(!IsNil(Browsers[name])) {
        browsers = [Browsers[name]];
    } else {
        throw new Error(`Invalid browser: "${name}"`);
    }

    // Resolve browsers
    return Promise.all(browsers.map((browser) =>
        resolveBrowser(packageDir, browser)
    ));
}

export default {
    resolve
};
