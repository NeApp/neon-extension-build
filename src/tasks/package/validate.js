import Chalk from 'chalk';
import ForEach from 'lodash/forEach';
import IsNil from 'lodash/isNil';
import IsString from 'lodash/isString';
import Path from 'path';
import Process from 'process';
import SemanticVersion from 'semver';

import Npm from '../../core/npm';
import Vorpal from '../../core/vorpal';
import {getDependencyTree} from '../../core/package';


const Logger = Vorpal.logger;

const IgnoredPackages = [
    /^radon-extension-([\w-]+)$/,

    /^(radon-extension-build\/)?travis-ci\/underscore.string$/
];

export function isIgnoredPackage(path) {
    for(let i = 0; i < IgnoredPackages.length; i++) {
        if(IgnoredPackages[i].test(path)) {
            return true;
        }
    }

    return false;
}

export function logError(message, ignored = false) {
    if(!ignored) {
        Logger.error(Chalk.red(message));
    } else {
        Logger.info(`${message} (ignored)`);
    }
}

export function logWarning(message, ignored = false) {
    if(!ignored) {
        Logger.warn(Chalk.yellow(message));
    } else {
        Logger.info(`${message} (ignored)`);
    }
}

export function validateRequirements(dependency, prefix = null) {
    if(IsNil(dependency)) {
        return true;
    }

    let result = true;

    ForEach(dependency.requires, (version, name) => {
        let path = `${prefix || ''}${name}`;
        let ignored = isIgnoredPackage(path);
        let success = true;

        // Resolve requirement
        let requirement = dependency.resolve(name);

        if(IsNil(requirement)) {
            logWarning(`[${path}] missing`, ignored);
            return;
        }

        // Ensure dependency matches
        if(!SemanticVersion.satisfies(requirement.version, version)) {
            logError(`[${path}] found ${requirement.version}, expected ${version}`, ignored);
            success = false;
        }

        // Update result
        if(!success && !ignored) {
            result = false;
        }
    });

    return result;
}

export function validateDependencies(packages, tree, prefix = null) {
    if(IsNil(packages)) {
        return true;
    }

    let result = true;

    ForEach(packages, (pkg, name) => {
        let path = `${prefix || ''}${name}`;
        let ignored = isIgnoredPackage(path);
        let success = true;

        if(IsString(pkg)) {
            pkg = { version: pkg };
        }

        // Resolve dependency
        let dependency = tree.resolve(name);

        if(IsNil(dependency)) {
            logWarning(`[${path}] extraneous`, ignored);
            return;
        }

        // Ensure modules have no "integrity" field defined
        if(name.indexOf('@radon-extension/') === 0 && !IsNil(dependency.integrity)) {
            logError(`[${path}] "integrity" field shouldn\'t be defined`);
            success = false;
        }

        // Ensure dependency matches
        if(pkg.version !== dependency.version) {
            logError(`[${path}] found ${pkg.version}, expected ${dependency.version}`, ignored);
            success = false;
        }

        // Update result
        if(!success && !ignored) {
            result = false;
        }

        // Validate dependencies
        if(!validateDependencies(pkg.dependencies, dependency, `${path}/`)) {
            result = false;
        }

        // Validate requirements
        if(!validateRequirements(dependency, `${path}/`)) {
            result = false;
        }
    });

    return result;
}

// Command
let cmd = Vorpal.command('package:validate', 'Validate package dependencies.')
    .option('--debug', 'Enable debug messages')
    .option('--target <target>', 'Target package [default: ./]');

// Action
cmd.action(({branch, options}) => {
    let path = Path.resolve(options.target || Process.cwd());

    // Configure logger
    if(options['debug']) {
        Vorpal.logger.setFilter('debug');
    }

    // Retrieve package tree
    return getDependencyTree(path).then((tree) =>
        // Resolve installed packages
        Npm.list(path, { '--json': true }).catch((r) => r).then(({ stdout }) => {
            let pkg = JSON.parse(stdout);

            if(IsNil(pkg.dependencies)) {
                return Promise.reject(new Error('No packages resolved'));
            }

            // Validate packages
            if(!validateDependencies(pkg.dependencies, tree)) {
                return Promise.reject(new Error('Validation failed'));
            }

            // Validation successful
            return true;
        })
    ).catch((err) => {
        Vorpal.logger.error(err.stack || err.message || err);
        Process.exit(1);
    });
});
