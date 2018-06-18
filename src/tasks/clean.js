import Delete from 'del';
import Filesystem from 'fs';
import Path from 'path';

import {Task} from '../core/helpers';


export const Clean = Task.create({
    name: 'clean',
    description: 'Clean the build environment.'
}, function(log, browser, environment) {
    if(!Filesystem.existsSync(environment.buildPath)) {
        log.info('Skipped (path doesn\'t exist)');
        return Promise.resolve();
    }

    log.debug('Cleaning the build directory...');
    log.debug(` - Path: "${environment.buildPath}"`);

    return Delete([
        Path.join(environment.buildPath, '**/*')
    ], {
        force: true
    }).then(() => {
        log.debug('Done');
    });
});

export default Clean;
