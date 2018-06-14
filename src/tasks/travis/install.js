import Chalk from 'chalk';
import Filesystem from 'fs-extra';
import GentleFS from 'gentle-fs';
import Merge from 'lodash/merge';
import Mkdirp from 'mkdirp';
import Path from 'path';
import Process from 'process';

import Git from '../../core/git';
import Github from '../../core/github';
import Npm from '../../core/npm';
import Vorpal from '../../core/vorpal';
import {isBrowser} from '../../core/browser';
import {getPackageModules, writePackage, writePackageLocks} from '../../core/package';
import {resolveOne, runSequential} from '../../core/helpers/promise';


export function getBranches(current) {
    let branches;

    if(current.indexOf('v') === 0) {
        branches = ['master'];
    } else {
        branches = ['develop', 'master'];
    }

    // Find existing position of `current`
    let i = branches.indexOf(current);

    if(i < 0) {
        // Add current branch to front
        branches.unshift(current);
    } else if(i > 0) {
        // Move current branch to front
        branches.splice(i, 1);
        branches.unshift(current);
    }

    return branches;
}

export function clone(target, branch, name) {
    let modulesPath = Path.join(target, '.modules');

    // Build local module path
    let localPath = Path.join(modulesPath, name);

    if(Filesystem.existsSync(localPath)) {
        return Promise.resolve({
            branch,
            localPath
        });
    }

    // Install module
    return resolveOne(getBranches(branch), (branch) => Github.exists(name, branch).then(() => {
        Vorpal.logger.info(
            `[NeApp/${name}#${branch}] Cloning to "${Path.relative(Process.cwd(), localPath)}...`
        );

        // Clone repository
        return Git.clone(modulesPath, `https://github.com/NeApp/${name}.git`, localPath, [
            '-b', branch,
            '--depth', '1'
        ]).then(() => ({
            branch,
            localPath
        }));
    }));
}

function link(target, branch, name) {
    // Clone repository for module
    return clone(target, branch, name).then(({branch, localPath}) => {
        Vorpal.logger.info(`[NeApp/${name}#${branch}] Installing dependencies...`);

        // Install dependencies
        return Npm.install(localPath).then(
            Npm.createHandler(Vorpal.logger, `[NeApp/${name}#${branch}]`)
        ).then(() => {
            Vorpal.logger.info(`[NeApp/${name}#${branch}] Linking to "node_modules/${name}"...`);

            return new Promise((resolve, reject) => {
                // Create symbolic link to module
                GentleFS.link(localPath, `${target}/node_modules/${name}`, {
                    prefixes: [
                        `${target}/.modules/`,
                        `${target}/node_modules/`
                    ]
                }, (err) => {
                    if(err) {
                        reject(err);
                        return;
                    }

                    resolve();
                });
            });
        });
    }).catch((err) => {
        Vorpal.logger.warn(`[NeApp/${name}#${branch}] Error raised: ${err.message || err}`);
        return Promise.reject(err);
    });
}

function pack(target, branch, name) {
    // Clone repository for module
    return clone(target, branch, name).then(({branch, localPath}) => {
        Vorpal.logger.info(`[NeApp/${name}#${branch}] Installing dependencies...`);

        // Install dependencies
        return Npm.install(localPath).then(
            Npm.createHandler(Vorpal.logger, `[NeApp/${name}#${branch}]`)
        ).then(() => {
            Vorpal.logger.info(`[NeApp/${name}#${branch}] Packing module...`);

            // Pack module
            return Npm.pack(target, localPath).then(({stdout, stderr}) => {
                let lines = stdout.split('\n');

                let file = lines[lines.length - 1];

                if(file.indexOf('neon-extension-') !== 0) {
                    Vorpal.logger.error(`[NeApp/${name}#${branch}] Invalid file: ${file}`);
                    return Promise.reject();
                }

                Npm.writeLines(Vorpal.logger, stderr, {
                    defaultColour: 'cyan',
                    prefix: `[NeApp/${name}#${branch}]`
                });

                Vorpal.logger.info(Chalk.green(`[NeApp/${name}#${branch}] ${file}`));

                return file;
            }).then((file) => ({
                [name]: `file:${file}`
            }));
        });
    }).catch((err) => {
        Vorpal.logger.warn(`[NeApp/${name}#${branch}] Error raised: ${err.message || err}`);
        return Promise.reject(err);
    });
}

function installBrowser(target, branch, modules) {
    // Pack modules
    return runSequential(modules, (name) =>
        pack(target, branch, name)
    ).then((results) => {
        let versions = Merge({}, ...results);

        Vorpal.logger.info(`Updating ${Object.keys(versions).length} package version(s)...`);

        // Update package versions
        return Promise.resolve()
            .then(() => writePackage(target, versions))
            .then(() => writePackageLocks(target, versions));
    });
}

function installModule(target, branch, modules) {
    // Link modules
    return runSequential(modules, (name) =>
        link(target, branch, name)
    );
}

function install(target, branch, options) {
    options = {
        reuse: false,

        ...(options || {})
    };

    // Build modules path
    let modulesPath = Path.join(target, '.modules');

    // Remove modules directory (if not reusing modules, and one exists)
    if(!options.reuse && Filesystem.existsSync(modulesPath)) {
        Vorpal.logger.info('Removing existing modules...');

        Filesystem.removeSync(modulesPath);
    }

    // Ensure directory exists
    Mkdirp.sync(modulesPath);

    // Read package details
    return Filesystem.readJson(Path.join(target, 'package.json')).then((pkg) => {
        let modules = getPackageModules(pkg);

        Vorpal.logger.info(
            `Installing ${modules.length} module(s) to "${Path.relative(Process.cwd(), target) || `.${Path.sep}`}"...`
        );

        // Browser
        if(isBrowser(pkg['name'])) {
            return installBrowser(target, branch, modules);
        }

        // Module
        return installModule(target, branch, modules);
    }).then(() => {
        Vorpal.logger.info('Installing package...');

        // Install package
        return Npm.install(target).then(
            Npm.createHandler(Vorpal.logger)
        );
    }).then(() => {
        Vorpal.logger.info('Cleaning package...');

        // Clean "package-lock.json" (remove "integrity" field from modules)
        return writePackageLocks(target);
    });
}

// Command
let cmd = Vorpal.command('travis:install <branch>', 'Install travis environment.')
    .option('--reuse', 'Re-use existing modules')
    .option('--target <target>', 'Target package [default: ./]');

// Action
cmd.action(({branch, options}) => {
    let target = Path.resolve(options.target || Process.cwd());

    // Run task
    return install(target, branch, options).catch((err) => {
        Vorpal.logger.error(err.stack || err.message || err);
        Process.exit(1);
    });
});
