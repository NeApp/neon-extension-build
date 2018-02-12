import CloneDeep from 'lodash/cloneDeep';


const BaseBrowser = {
    name: null,
    package: null,

    includeVersionName: false,

    webpack: {
        common: ['whatwg-fetch']
    }
};

const ChromeBrowser = {
    ...CloneDeep(BaseBrowser),

    name: 'chrome',
    package: 'neon-extension-chrome',

    includeVersionName: true
};

const FirefoxBrowser = {
    ...CloneDeep(BaseBrowser),

    name: 'firefox',
    package: 'neon-extension-firefox'
};

export default {
    chrome:     ChromeBrowser,
    firefox:    FirefoxBrowser
};
