import IsNil from 'lodash/isNil';
import Keys from 'lodash/keys';
import Path from 'path';

import Link from '../../core/link';
import {Task} from '../../core/helpers';
import {getBrowserModules, orderModules} from '../../core/package';
import {runSequential} from '../../core/helpers/promise';


export const LinkModules = Task.create({
    name: 'module:link',
    description: 'Link modules.'
}, (log, browser, environment) => {
    if(environment.name !== 'development') {
        return Promise.reject(new Error('Only development environments are supported'));
    }

    // Link module requirements
    return runSequential(getBrowserModules(browser), (module) =>
        // Link required modules
        runSequential(orderModules([
            ...Keys(module.package['dependencies']),
            ...Keys(module.package['peerDependencies'])
        ]), (name) => {
            if(name.indexOf('neon-extension-') !== 0) {
                return Promise.resolve();
            }

            // Retrieve dependency
            let dependency = browser.modules[name];

            if(IsNil(dependency)) {
                return Promise.reject(new Error(`Unknown module: ${name}`));
            }

            log.info(`[${module.name}] "${name}" -> "${dependency.path}"`);

            // Create link to dependency
            return Link.create(`${module.path}/node_modules/${name}`, dependency.path, [
                Path.resolve(dependency.path, '../'),
                `${module.path}/node_modules/`
            ]);
        })
    );
});

export default LinkModules;
