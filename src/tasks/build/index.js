import Filesystem from 'fs-extra';
import Path from 'path';

import Assets from './assets';
import Credits from './credits';
import Extension from './extension';
import Manifest from './manifest';
import Archive from '../deploy/archive';
import Bintray from '../deploy/bintray';
import Checksum from '../../core/checksum';
import {Task} from '../../core/helpers';


export const Build = Task.create({
    name: 'build',
    description: 'Build extension.',

    required: [
        Assets,
        Credits,
        Extension,
        Manifest,

        Archive
    ],

    optional: [
        Bintray
    ]
}, (log, browser, environment) => {
    // Write checksums
    return Checksum.writeMany(environment.buildPath, '{unpacked/**/*,*.zip}')
        // Write state
        .then(() => writeState(browser, environment));
});

function writeState(browser, environment) {
    return Promise.resolve()
        .then(() => Filesystem.writeJson(Path.join(environment.buildPath, 'browser.json'), browser, {
            spaces: 2
        }))
        .then(() => Filesystem.writeJson(Path.join(environment.buildPath, 'environment.json'), environment, {
            spaces: 2
        }));
}

// Import children
Filesystem.readdirSync(__dirname).forEach(function(name) {
    try {
        require('./' + name);
    } catch(e) {
        console.warn('Unable to import "./' + name + '": ' + e);
    }
});

export default Build;
