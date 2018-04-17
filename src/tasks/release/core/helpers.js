import PickBy from 'lodash/pickBy';
import Values from 'lodash/values';


export function getPackages(browser) {
    return [
        browser.modules['neon-extension-build'],

        // Core
        browser.modules['neon-extension-framework'],
        browser.modules['neon-extension-core'],

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
