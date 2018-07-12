import Filesystem from 'fs-extra';
import ForEach from 'lodash/forEach';
import IsEqual from 'lodash/isEqual';
import IsNil from 'lodash/isNil';
import Keys from 'lodash/keys';
import Path from 'path';
import PickBy from 'lodash/pickBy';
import SemanticVersion from 'semver';
import Values from 'lodash/values';

import {Task} from '../../core/helpers';
import {getDependencyTree} from '../../core/package';
import {runSequential} from '../../core/helpers/promise';


export function validateDependency(log, packageModuleNode, module, moduleNode, name, version, dev = false) {
    log.debug(`[${module.name}/${name}] ${version}`);

    // Resolve module dependency
    let moduleDependency = moduleNode.resolve(name);

    if(IsNil(moduleDependency)) {
        log.error(`[${module.name}/${name}] Unable to find dependency in module`);
        return false;
    }

    // Resolve package dependency
    let packageDependency = packageModuleNode.resolve(name);

    if(IsNil(packageDependency)) {
        if(dev) {
            return true;
        }

        log.error(`[${module.name}/${name}] Unable to find dependency in package`);
        return false;
    }

    // Ensure versions match
    if(moduleDependency.version !== packageDependency.version) {
        log.error(
            `[${module.name}/${name}] ${moduleDependency.version} doesn\'t match package ${packageDependency.version}`
        );
        return false;
    }

    // Ensure dependency matches specification
    if(!SemanticVersion.satisfies(moduleDependency.version, version)) {
        log.error(`[${module.name}/${name}] ${moduleDependency.version} doesn't satisfy ${version}`);
        return false;
    }

    // Dependency valid
    return true;
}

export function validateDependencies(log, browser, packageModuleNode, module, moduleNode) {
    let valid = true;

    // Validate dependencies
    ForEach(module.package.dependencies, (version, name) => {
        if(!validateDependency(log, packageModuleNode, module, moduleNode, name, version)) {
            valid = false;
        }
    });

    // Validate development dependencies
    ForEach(module.package.devDependencies, (version, name) => {
        if(!validateDependency(log, packageModuleNode, module, moduleNode, name, version, true)) {
            valid = false;
        }
    });

    return valid;
}

export function validateDevelopmentDependencies(log, browser, build, module) {
    let valid = true;

    // Ensure development dependencies match radon-extension-build
    let incorrect = PickBy(module.package['devDependencies'], (current, name) => {
        let common = build.package['dependencies'][name];

        if(IsNil(common) || common === current) {
            return false;
        }

        if(SemanticVersion.valid(common)) {
            return !SemanticVersion.satisfies(common, current);
        }

        return true;
    });

    if(Keys(incorrect).length > 0) {
        ForEach(Keys(incorrect).sort(), (name) => {
            let common = build.package['dependencies'][name];

            if(SemanticVersion.valid(common)) {
                log.error(`[${module.name}/${name}] ${incorrect[name]} doesn\'t satisfy package ${common}`);
            } else {
                log.error(`[${module.name}/${name}] ${incorrect[name]} doesn\'t match package ${common}`);
            }
        });

        valid = false;
    }

    return valid;
}

export function validateModules(log, browser, environment, packageNode) {
    let valid = true;

    // Retrieve build module
    let build = browser.modules['build'];

    // Validate modules
    return runSequential(Values(browser.modules), (module) => {
        if(module.type === 'package') {
            return Promise.resolve();
        }

        let path = module.path;

        // Use module source in production environments (if available)
        if(environment.name === 'production') {
            let modulePath = Path.join(browser.extension.path, '.modules', module.name);

            if(!Filesystem.existsSync(modulePath)) {
                log.info(`[${module.name}] Skipped (module source not available)`);
                return Promise.resolve();
            }

            path = modulePath;
        }

        // Retrieve package dependency
        let packageModuleNode = packageNode.get(module.name);

        if(IsNil(packageModuleNode)) {
            return Promise.reject(new Error(
                'Unable to find module in package tree'
            ));
        }

        // Ensure "package-lock.json" exists
        if(!Filesystem.existsSync(Path.join(path, 'package-lock.json'))) {
            log.info(`[${module.name}] Skipped (no "package-lock.json" file exists)`);
            return Promise.resolve();
        }

        // Retrieve module dependency tree
        return getDependencyTree(path).catch(() => null).then((moduleNode) => {
            if(IsNil(moduleNode)) {
                log.error(`[${module.name}] Unable to parse "package-lock.json" file`);
                valid = false;
                return;
            }

            // Ensure cached requirements are up to date
            if(!IsEqual(packageModuleNode.requires, module.package.dependencies)) {
                log.warn(`[${module.name}] Cached requirements are out of date`);
                valid = false;
            }

            // Validate module dependencies
            if(!validateDependencies(log, browser, packageModuleNode, module, moduleNode)) {
                valid = false;
            }

            // Validate development dependencies
            if(!validateDevelopmentDependencies(log, browser, build, module)) {
                valid = false;
            }
        }).catch((err) => {
            log.error(`[${module.name}] ${(err && err.stack) ? err.stack : err}`);
            valid = false;
        });
    }).then(() => {
        if(!valid) {
            return Promise.reject(new Error('Validation failed'));
        }

        return Promise.resolve();
    });
}

export const ValidateModules = Task.create({
    name: 'module:validate',
    description: 'Validate modules.'
}, (log, browser, environment) => {
    // Retrieve package dependency tree
    return getDependencyTree(browser.path).then((packageNode) =>
        // Validate modules
        validateModules(log, browser, environment, packageNode)
    );
});

export default ValidateModules;
