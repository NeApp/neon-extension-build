import Chalk from 'chalk';
import CloneDeep from 'lodash/cloneDeep';
import Filesystem from 'fs-extra';
import IsNil from 'lodash/isNil';
import MapValues from 'lodash/mapValues';
import OmitBy from 'lodash/omitBy';
import Path from 'path';
import PickBy from 'lodash/pickBy';
import SemanticVersion from 'semver';
import Values from 'lodash/values';

import {Task} from '../../core/helpers';
import {runSequential} from '../../core/helpers/promise';


function getModulesOrdered(browser) {
    return [
        browser.modules['neon-extension-build'],

        // Core
        browser.modules['neon-extension-framework'],
        browser.modules['neon-extension-core'],

        // Plugins
        ...Values(PickBy(browser.modules, (module) => [
            'core',
            'tool',
            'package'
        ].indexOf(module.type) < 0)),

        // Extension
        browser.extension
    ];
}

function isPatchRelease(current, next) {
    return (
        SemanticVersion.major(current) === SemanticVersion.major(next) &&
        SemanticVersion.minor(current) === SemanticVersion.minor(next)
    )
}

function updateDependencies(versions, pkg, key, caret = false) {
    if(IsNil(pkg[key])) {
        return;
    }

    // Remove empty dependencies
    if(Object.keys(pkg[key]).length < 1) {
        delete pkg[key];
        return;
    }

    // Update dependencies
    pkg[key] = MapValues(pkg[key], (version, name) => {
        if(name.indexOf('neon-extension-') < 0) {
            return version;
        }

        if(IsNil(versions[name])) {
            throw new Error(`Unknown dependency: ${name}`);
        }

        if(caret) {
            return `^${versions[name]}`;
        }

        return versions[name];
    });
}

function updateModules(log, browser, version) {
    let versions = {};

    return runSequential(getModulesOrdered(browser), (module) => {
        let pkg = CloneDeep(module.package);

        // Ensure package metadata exists
        if(IsNil(pkg)) {
            return Promise.reject(Chalk.red(
                `Unable to create release, ${module.name} has no package metadata`
            ));
        }

        // Ensure the repository isn't dirty
        if(module.repository.dirty) {
            return Promise.reject(Chalk.red(
                `Unable to create release, ${module.name} is dirty`
            ));
        }

        // Only create patch releases on modules with changes
        if(module.repository.ahead > 0 || !isPatchRelease(pkg.version, version)) {
            log.info(Chalk.green(`[${module.name}] ${version}`));

            // Update version
            pkg.version = version;

            // Store module version
            versions[module.name] = version;
        } else {
            log.info(`[${module.name}] ${pkg.version}`);

            // Store module version
            versions[module.name] = pkg.version;
        }

        // Update dependencies
        updateDependencies(versions, pkg, 'dependencies');

        // Update development dependencies
        updateDependencies(versions, pkg, 'devDependencies');

        // Update peer dependencies
        updateDependencies(versions, pkg, 'peerDependencies', true);

        // Read package metadata from file (to determine the current EOL character)
        let path = Path.join(module.path, 'package.json');

        return Filesystem.readFile(path).then((data) =>
            // Write package metadata to file
            Filesystem.writeJson(path, OmitBy(pkg, IsNil), {
                EOL: data.indexOf('\r\n') >= 0 ? '\r\n' : '\n',
                spaces: 2
            })
        )
    });
}

export const CreateRelease = Task.create({
    name: 'release:create <version>',
    description: 'Create release.'
}, (log, browser, environment, {version}) => {
    // Ensure the provided `version` is valid
    if(!SemanticVersion.valid(version)) {
        return Promise.reject(new Error(`Invalid version: ${version}`));
    }

    // Update modules
    return updateModules(log, browser, version);
}, {
    version: null
});

export default CreateRelease;
