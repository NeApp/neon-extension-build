import Filesystem from 'fs-extra';
import Filter from 'lodash/filter';
import ForEach from 'lodash/forEach';
import Https from 'https';
import IsNil from 'lodash/isNil';
import Path from 'path';
import Process from 'process';
import {exec} from 'child_process';

import Vorpal from '../../core/vorpal';
import {resolveOne, runSequential} from '../../core/helpers/promise';


let cmd = Vorpal.command('install:travis <branch>', 'Install travis environment.')
    .option('--target <target>', 'Target package [default: ./]');

function exists(name, branch) {
    return new Promise((resolve, reject) => {
        let req = Https.request({
            method: 'HEAD',
            protocol: 'https:',
            hostname: 'github.com',
            port: 443,
            path: `/NeApp/${name}/tree/${branch}`
        }, (res) => {
            if(res.statusCode >= 200 && res.statusCode < 300) {
                resolve();
            } else {
                reject(new Error('Branch doesn\'t exist'));
            }
        });

        // Send request
        req.end();
    });
}

function getPackageModules(path) {
    return Filesystem.readJson(path).then((pkg) => {
        let match = /^neon-extension-(\w+)$/.exec(pkg.name);

        if(IsNil(match) || ['build', 'core', 'framework'].indexOf(match[1]) >= 0) {
            return Promise.reject(new Error(
                `Invalid package: ${pkg.name} (expected current directory to contain a browser package)`
            ));
        }

        // Find package modules
        return Filter(Object.keys(pkg.dependencies), (name) =>
            name.indexOf('neon-extension-') === 0 && [
                'neon-extension-build'
            ].indexOf(name) < 0
        );
    });
}

function install(name, options) {
    return new Promise((resolve, reject) => {
        exec(`npm install ${name}`, options, (err, stdout, stderr) => {
            if(!IsNil(err)) {
                reject(err);
                return;
            }

            // Resolve promise
            resolve({
                stdout,
                stderr
            });
        });
    });
}

function installModule(name, branch, {cwd}) {
    let branches = ['develop', 'master'];

    // Insert specified branch at start
    let i = branches.indexOf(branch);

    if(i < 0) {
        branches.unshift(branch);
    } else if(i > 0) {
        branches.splice(i, 1);
        branches.unshift(branch);
    }

    return resolveOne(branches, (branch) =>
        // Check if branch exists
        exists(name, branch).then(() => {
            Vorpal.logger.info(`[NeApp/${name}#${branch}] Installing...`);

            // Install module
            return install(`NeApp/${name}#${branch}`, { cwd }).then(({stdout, stderr}) => {
                if(!IsNil(stderr)) {
                    ForEach(stderr.trim().split('\n'), (line) => {
                        let type;

                        if(line.startsWith('npm ERR')) {
                            type = 'error';
                            line = line.substring(9);
                        } else if(line.startsWith('npm WARN')) {
                            type = 'warn';
                            line = line.substring(9);
                        }

                        // Log message
                        if(line.indexOf('requires a peer of') >= 0) {
                            // Peer dependency message
                            Vorpal.logger.debug(`[NeApp/${name}#${branch}] ${line}`);
                        } else if(line.endsWith('loglevel="notice"')) {
                            // Notice
                            Vorpal.logger.debug(`[NeApp/${name}#${branch}] ${line}`);
                        } else if(type === 'error') {
                            // Error
                            Vorpal.logger.error(`[NeApp/${name}#${branch}] ${line}`);
                        } else if(type === 'warn') {
                            // Warning
                            Vorpal.logger.warn(`[NeApp/${name}#${branch}] ${line}`);
                        } else {
                            // Unknown level
                            Vorpal.logger.info(`[NeApp/${name}#${branch}] ${line}`);
                        }
                    });
                }

                if(!IsNil(stdout)) {
                    ForEach(stdout.trim().split('\n'), (line) =>
                        Vorpal.logger.info(`[NeApp/${name}#${branch}] ${line}`)
                    );
                }
            }, (err) => {
                Vorpal.logger.warn(`[NeApp/${name}#${branch}] Exited with return code: ${err.code}`);
                return Promise.reject(err);
            });
        }, (err) => {
            Vorpal.logger.warn(`[NeApp/${name}#${branch}] Error raised: ${err.message || err}`);
            return Promise.reject(err);
        })
    );
}

// Action
cmd.action(({branch, options}) => {
    let target = Path.resolve(options.target || Process.cwd());
    let path = Path.resolve(target, 'package.json');

    // Find package modules
    return getPackageModules(path).then((modules) => {
        Vorpal.logger.info(`Installing ${modules.length} module(s) to "${target}"...`);

        // Install modules sequentially
        return runSequential(modules, (name) =>
            installModule(name, branch, {
                cwd: target
            })
        );
    }).catch((err) => {
        Vorpal.logger.error(err.stack || err.message || err);
        Process.exit(1);
    });
});
