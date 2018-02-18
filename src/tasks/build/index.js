import Filesystem from 'fs-extra';
import Path from 'path';

import Assets from './assets';
import Credits from './credits';
import Extension from './extension';
import Import from '../../core/helpers/import';
import Manifest from './manifest';
import Bintray from '../deploy/bintray';
import Checksum from '../../core/checksum';
import ReleaseArchiveTask from '../archive/release';
import SourceArchiveTask from '../archive/source';
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
        Assets,
        Credits,
        Extension,
        Manifest,

        ReleaseArchiveTask,
        SourceArchiveTask
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

// Import children
Import(__dirname);

export default Build;
