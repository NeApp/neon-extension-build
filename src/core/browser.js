import CloneDeep from 'lodash/cloneDeep';
import IsNil from 'lodash/isNil';
import Path from 'path';

import Browsers from './constants/browsers';
import Extension from './extension';
import Module from './module';
import Version from './version';


function resolveBrowser(packageDir, browser) {
    return Promise.resolve(CloneDeep(browser))
        .then((browser) => ({
            ...browser,

            path: Path.join(packageDir, 'Packages', browser.package)
        }))
        // Resolve extension
        .then((browser) => Extension.resolve(packageDir, browser.package).then((extension) => ({
            ...browser,

            extension
        })))
        // Resolve modules
        .then((browser) => Module.resolveMany(packageDir, browser.extension.modules).then((modules) => ({
            ...browser,

            modules
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
