import CloneDeep from 'lodash/cloneDeep';


const BaseBrowser = {
    name: null,

    title: null,
    package: null,

    includeVersionName: false,

    webpack: {
        common: ['whatwg-fetch']
    }
};

const ChromeBrowser = {
    ...CloneDeep(BaseBrowser),

    name: 'chrome',

    title: 'Chrome',
    package: 'neon-extension-chrome',

    includeVersionName: true
};

const FirefoxBrowser = {
    ...CloneDeep(BaseBrowser),

    name: 'firefox',

    title: 'Firefox',
    package: 'neon-extension-firefox'
};

const OperaBrowser = {
    ...CloneDeep(BaseBrowser),

    name: 'opera',

    title: 'Opera',
    package: 'neon-extension-opera',

    includeVersionName: true
};

export default {
    chrome: ChromeBrowser,
    firefox: FirefoxBrowser,
    opera: OperaBrowser
};
