import Path from 'path';

import {Task} from '../../core/helpers';
import {createZip} from '../../core/zip';


export const ReleaseArchiveTask = Task.create({
    name: 'archive:release',
    description: 'Create release archive of the built extension.',

    required: [
        'build:assets',
        'build:extension',
        'build:locales',
        'build:manifest'
    ]
}, (log, browser, environment) => {
    return createZip({
        archive: Path.join(environment.buildPath, `Radon-${browser.title}-${browser.versionName}.zip`),

        source: environment.outputPath,
        pattern: '**/*'
    });
});

export default ReleaseArchiveTask;
