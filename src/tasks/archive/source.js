import MapValues from 'lodash/mapValues';
import Path from 'path';
import Pick from 'lodash/pick';

import Copy from '../../core/copy';
import Json from '../../core/json';
import {Task} from '../../core/helpers';
import {createZip} from '../../core/zip';


const Pattern = '{Assets/**/*,*.json,*.md,.*}';

function writeBuildDetails(browser, environment) {
    let path = Path.join(environment.output.source, 'build.json');

    // Write build details
    Json.write(path, MapValues(browser.modules, (module) => {
        if(module.type === 'package') {
            return Pick(module, ['repository', 'travis']);
        }

        return Pick(module, ['repository']);
    }), {
        spaces: 2
    });
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
        // Write build details
        .then(() => writeBuildDetails(browser, environment))
        // Create an archive of browser sources
        .then(() => createZip({
            archive: Path.join(environment.buildPath, `Neon-${browser.title}-${browser.versionName}-sources.zip`),

            source: environment.output.source,
            pattern: '{Assets/**/*,*.json,*.md,.*}'
        }));
});

export default SourceArchiveTask;
