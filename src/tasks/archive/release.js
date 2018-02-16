import Path from 'path';

import Assets from '../build/assets';
import Extension from '../build/extension';
import Manifest from '../build/manifest';
import {Task} from '../../core/helpers';
import {createZip} from '../../core/zip';


export const ReleaseArchiveTask = Task.create({
    name: 'archive:release',
    description: 'Create release archive of the built extension.',

    required: [
        Assets,
        Extension,
        Manifest
    ]
}, (log, browser, environment) => {
    return createZip({
        archive: Path.join(environment.buildPath, `Neon-${browser.title}-${browser.versionName}.zip`),

        source: environment.outputPath,
        pattern: '**/*'
    });
});

export default ReleaseArchiveTask;
