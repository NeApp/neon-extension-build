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

    package: '@radon-extension/chrome',
    repository: 'radon-extension-chrome',

    includeVersionName: true
};

const FirefoxBrowser = {
    ...CloneDeep(BaseBrowser),

    name: 'firefox',
    title: 'Firefox',

    package: '@radon-extension/firefox',
    repository: 'radon-extension-firefox'
};

const OperaBrowser = {
    ...CloneDeep(BaseBrowser),

    name: 'opera',
    title: 'Opera',

    package: '@radon-extension/opera',
    repository: 'radon-extension-opera',

    includeVersionName: true
};

export default {
    chrome: ChromeBrowser,
    firefox: FirefoxBrowser,
    opera: OperaBrowser
};
