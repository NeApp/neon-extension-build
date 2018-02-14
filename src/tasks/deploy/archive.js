import Path from 'path';

import Assets from '../build/assets';
import Extension from '../build/extension';
import Manifest from '../build/manifest';
import {Task} from '../../core/helpers';
import {createZip} from '../../core/zip';


export const Archive = Task.create({
    name: 'deploy:archive',
    description: 'Create an archive of the built extension.',

    required: [
        Assets,
        Extension,
        Manifest
    ]
}, (log, browser, environment) => {
    // Create archive of build
    return createZip({
        archive: Path.join(environment.buildPath, `Neon-${browser.title}-${browser.versionName}.zip`),

        source: environment.outputPath,
        pattern: '**/*'
    });
});

export default Archive;
