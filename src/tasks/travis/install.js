import Filesystem from 'fs-extra';
import GentleFS from 'gentle-fs';
import Mkdirp from 'mkdirp';
import Path from 'path';
import Process from 'process';

import Git from '../../core/git';
import Github from '../../core/github';
import Npm from '../../core/npm';
import Vorpal from '../../core/vorpal';
import {getPackageModules} from '../../core/package';
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

function install(name, branch, { cwd }) {
    let modulesPath = Path.join(cwd, '.modules');

    // Remove directory (if it already exists)
    if(Filesystem.existsSync(modulesPath)) {
        Filesystem.removeSync(modulesPath);
    }

    // Ensure directory exists
    Mkdirp.sync(modulesPath);

    // Install module
    return resolveOne(getBranches(branch), (branch) => Github.exists(name, branch).then(() => {
        let localPath = Path.join(modulesPath, name);

        return Promise.resolve()
            .then(() => {
                Vorpal.logger.info(
                    `[NeApp/${name}#${branch}] Cloning to "${Path.relative(Process.cwd(), localPath)}...`
                );

                // Clone repository
                return Git.clone(modulesPath, `https://github.com/NeApp/${name}.git`, localPath, [
                    '-b', branch,
                    '--depth', '1'
                ]);
            })
            .then(() => {
                Vorpal.logger.info(`[NeApp/${name}#${branch}] Installing dependencies...`);

                // Install dependencies
                return Npm.install({ cwd: localPath }).then(
                    Npm.createHandler(Vorpal.logger, `[NeApp/${name}#${branch}]`)
                );
            })
            .then(() => {
                Vorpal.logger.info(`[NeApp/${name}#${branch}] Creating symbolic link...`);

                return new Promise((resolve, reject) => {
                    // Create symbolic link to module
                    GentleFS.link(localPath, `${cwd}/node_modules/${name}`, {
                        prefixes: [
                            `${cwd}/node_modules/`,
                            modulesPath
                        ]
                    }, (err) => {
                        if(err) {
                            reject(err);
                            return;
                        }

                        resolve();
                    });
                });
            })
            .catch((err) => {
                Vorpal.logger.error(`[NeApp/${name}#${branch}] Unable to install module: ${err}`);
            });
    }, (err) => {
        Vorpal.logger.warn(`[NeApp/${name}#${branch}] Error raised: ${err.message || err}`);
        return Promise.reject(err);
    }));
}

// Command
let cmd = Vorpal.command('travis:install <branch>', 'Install travis environment.')
    .option('--target <target>', 'Target package [default: ./]');

// Action
cmd.action(({branch, options}) => {
    let target = Path.resolve(options.target || Process.cwd());
    let path = Path.resolve(target, 'package.json');

    // Find package modules
    return getPackageModules(path).then((modules) => {
        Vorpal.logger.info(
            `Installing ${modules.length} module(s) to "${Path.relative(Process.cwd(), target) || `.${Path.sep}`}"...`
        );

        // Install modules sequentially
        return runSequential(modules, (name) =>
            install(name, branch, { cwd: target })
        );
    }).catch((err) => {
        Vorpal.logger.error(err.stack || err.message || err);
        Process.exit(1);
    });
});
