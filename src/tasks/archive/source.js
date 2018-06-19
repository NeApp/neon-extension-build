import IsNil from 'lodash/isNil';
import MapValues from 'lodash/mapValues';
import Path from 'path';
import Pick from 'lodash/pick';

import Copy from '../../core/copy';
import Json from '../../core/json';
import {Task} from '../../core/helpers';
import {createZip} from '../../core/zip';
import {writePackage, writePackageLocks} from '../../core/package';


const Pattern = '{Assets/**/*,*.json,*.md,.*}';

export function getModuleVersions(browser) {
    return MapValues(browser.modules, (module) => {
        if(!IsNil(module.repository.tag)) {
            let tag = module.repository.tag;

            // Ensure tag is valid
            if(tag.indexOf('v') !== 0) {
                throw new Error(`Invalid tag "${tag}" for ${module.name}`);
            }

            // Return version (without "v" prefix)
            return tag.substring(1);
        }

        // Ensure commit exists
        if(IsNil(module.repository.commit)) {
            throw new Error(`No commit available for ${module.name}`);
        }

        // Commit
        return {
            version: `NeApp/${module.name}#${module.repository.commit}`,
            from: `${module.name}@NeApp/${module.name}#${module.repository.commit}`
        };
    });
}

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
    let versions = getModuleVersions(browser);

    // Copy browser sources to the build directory
    return Copy(Pattern, browser.path, environment.output.source)
        // Update package versions
        .then(() => writePackage(environment.output.source, versions))
        // Update package lock versions
        .then(() => writePackageLocks(environment.output.source, versions))
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
