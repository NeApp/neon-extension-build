import ForEach from 'lodash/forEach';
import IsNil from 'lodash/isNil';
import {exec} from 'child_process';

import Github from './github';
import Vorpal from './vorpal';
import {resolveOne} from './helpers/promise';


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

export function install(name, options) {
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

export function installModule(name, branch, {cwd}) {
    return resolveOne(getBranches(branch), (branch) =>
        // Check if branch exists
        Github.exists(name, branch).then(() => {
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

export default {
    install,
    installModule
};
