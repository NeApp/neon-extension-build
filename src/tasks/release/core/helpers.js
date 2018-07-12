import PickBy from 'lodash/pickBy';
import Values from 'lodash/values';


export function getPackages(browser) {
    return [
        browser.modules['build'],

        // Core
        browser.modules['framework'],
        browser.modules['core'],

        // Plugins
        ...Values(PickBy(browser.modules, (module) => [
            'core',
            'tool',
            'package'
        ].indexOf(module.type) < 0)),

        // Extension
        browser.extension
    ];
}
