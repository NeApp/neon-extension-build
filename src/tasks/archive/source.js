import Path from 'path';

import Clean from '../clean';
import Copy from '../../core/copy';
import Json from '../../core/json';
import {Task} from '../../core/helpers';
import {createZip} from '../../core/zip';


const Pattern = '{assets/**/*,*.json,*.md,.*}';

function setPackageVersion(browser, environment) {
    let path = Path.join(environment.output.source, 'package.json');

    // Read package details from `path`
    return Json.read(path).then((pkg) =>
        // Update package version, and write back to `path`
        Json.write(path, {
            ...pkg,

            version: browser.version
        }, {
            spaces: 2
        })
    );
}

export const SourceArchiveTask = Task.create({
    name: 'archive:source',
    description: 'Create source archive of the browser package.',

    required: [
        Clean
    ]
}, (log, browser, environment) => {
    // Copy browser sources to the build directory
    return Copy(Pattern, browser.path, environment.output.source)
        // Set browser version
        .then(() => setPackageVersion(browser, environment))
        // Create an archive of browser sources
        .then(() => createZip({
            archive: Path.join(environment.buildPath, `Neon-${browser.title}-${browser.versionName}-sources.zip`),

            source: environment.output.source,
            pattern: '{assets/**/*,*.json,*.md,.*}'
        }));
});

export default SourceArchiveTask;
