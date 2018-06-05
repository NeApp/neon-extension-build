import Path from 'path';
import Pick from 'lodash/pick';

import Copy from '../../core/copy';
import Json from '../../core/json';
import {Task} from '../../core/helpers';
import {createZip} from '../../core/zip';


const Pattern = '{Assets/**/*,*.json,*.md,.*}';

function updateExtensionManifest(browser, environment) {
    let path = Path.join(environment.output.source, 'extension.json');

    // Read extension manifest from `path`
    return Json.read(path).then((pkg) =>
        // Update extension manifest, and write back to `path`
        Json.write(path, {
            ...pkg,

            ...Pick(browser.extension, [
                'repository',
                'travis'
            ])
        }, {
            spaces: 2
        })
    );
}

export const SourceArchiveTask = Task.create({
    name: 'archive:source',
    description: 'Create source archive of the browser package.',

    required: [
        'clean'
    ]
}, (log, browser, environment) => {
    // Copy browser sources to the build directory
    return Copy(Pattern, browser.path, environment.output.source)
        // Update extension manifest
        .then(() => updateExtensionManifest(browser, environment))
        // Create an archive of browser sources
        .then(() => createZip({
            archive: Path.join(environment.buildPath, `Neon-${browser.title}-${browser.versionName}-sources.zip`),

            source: environment.output.source,
            pattern: '{Assets/**/*,*.json,*.md,.*}'
        }));
});

export default SourceArchiveTask;
