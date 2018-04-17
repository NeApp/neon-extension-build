import Filesystem from 'fs-extra';
import Path from 'path';

import Import from '../../core/helpers/import';
import Checksum from '../../core/checksum';
import {Task} from '../../core/helpers';


function writeState(browser, environment) {
    return Promise.resolve()
        .then(() => Filesystem.writeJson(Path.join(environment.buildPath, 'browser.json'), browser, {
            spaces: 2
        }))
        .then(() => Filesystem.writeJson(Path.join(environment.buildPath, 'environment.json'), environment, {
            spaces: 2
        }));
}

export const Build = Task.create({
    name: 'build',
    description: 'Build extension.',

    required: [
        'build:assets',
        'build:credits',
        'build:extension',
        'build:manifest',

        'archive:release',
        'archive:source'
    ],

    optional: [
        'deploy:bintray'
    ]
}, (log, browser, environment) => {
    // Write checksums
    return Checksum.writeMany(environment.buildPath, '{unpacked/**/*,*.zip}')
        // Write state
        .then(() => writeState(browser, environment));
});

// Import children
Import(__dirname);

export default Build;
