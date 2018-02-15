import Delete from 'del';
import Filesystem from 'fs';
import Path from 'path';

import {Task} from '../core/helpers';


export const Clean = Task.create({
    name: 'clean',
    description: 'Clean the build environment.'
}, function(log, browser, environment) {
    let path = Path.join(environment.options['build-dir'], browser.name, environment.name);

    if(!Filesystem.existsSync(path)) {
        log.info('Skipping - Path doesn\'t exist');
        return Promise.resolve();
    }

    log.debug('Cleaning the build directory...');
    log.debug(` - Path: "${path}"`);

    return Delete([
        Path.join(path, '**/*')
    ], {
        force: true
    }).then(() => {
        log.debug('Done');
    });
});

export default Clean;
