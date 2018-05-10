import Chalk from 'chalk';
import Find from 'lodash/find';
import IsNil from 'lodash/isNil';
import IsString from 'lodash/isString';
import SemanticVersion from 'semver';
import SimpleGit from 'simple-git/promise';
import Travis from 'travis-ci';

import {GithubApi} from '../../core/github';
import {Task} from '../../core/helpers';
import {createRelease, updatePackageRelease} from './core/release';
import {getPackages} from './core/helpers';
import {runSequential} from '../../core/helpers/promise';


const travis = new Travis({
    version: '2.0.0'
});

function getTargetBranches(tag) {
    return [
        // Development
        'develop',

        // Version
        /v\d+\.\d+/.exec(tag)[0],

        // Pre-release
        'master'
    ];
}

function getTravisStatus(log, module, ref, options) {
    options = {
        createdAfter: null,
        sha: null,

        delay: 5 * 1000,
        retryAttempts: 6,
        retryInterval: 10 * 1000,

        ...(options || {})
    };

    return new Promise((resolve, reject) => {
        let attempts = 0;

        function run() {
            attempts++;

            // Stop retrying after the maximum attempts have been reached
            if(attempts > options.retryAttempts) {
                reject(new Error(`Unable to retrieve the travis status for "${ref}" on ${module.name}`));
                return;
            }

            log.debug(`[${module.name}] (GitHub) Fetching the status of "${ref}"...`);

            // Retrieve combined status for `ref`
            GithubApi.repos.getCombinedStatusForRef({
                owner: 'NeApp',
                repo: module.name,
                ref
            }).then(({data: {sha, statuses}}) => {
                // Ensure status `sha` matches the provided `sha`
                if(!IsNil(options.sha) && sha !== options.sha) {
                    setTimeout(run, options.retryInterval);
                    return;
                }

                // Find travis status
                let travis = Find(statuses, {
                    context: 'continuous-integration/travis-ci/push'
                });

                if(IsNil(travis)) {
                    setTimeout(run, options.retryInterval);
                    return;
                }

                // Ensure travis status was created after the provided timestamp
                if(!IsNil(options.createdAfter) && Date.parse(travis['created_at']) < options.createdAfter) {
                    setTimeout(run, options.retryInterval);
                    return;
                }

                // Resolve with travis status
                resolve(travis);
            });
        }

        log.debug(`[${module.name}] Waiting ${Math.round(options.delay / 1000)} seconds...`);

        setTimeout(run, options.delay);
    });
}

function awaitTravisBuild(log, module, ref, id, options) {
    options = {
        retryAttempts: 40,
        retryInterval: 15 * 1000,

        ...(options || {})
    };

    return new Promise((resolve, reject) => {
        let attempts = 0;

        function run() {
            attempts++;

            if(attempts === 2) {
                log.info(`[${module.name}] Building "${ref}" on Travis CI... (2 ~ 5 minutes)`);
            }

            // Stop retrying after the maximum attempts have been reached
            if(attempts > options.retryAttempts) {
                reject(new Error(`Build timeout for "${id}"`));
                return;
            }

            log.debug(`[${module.name}] (Travis CI) Fetching the state of build ${id}...`);

            // Retrieve build details for `id`
            travis.builds(id).get((err, res) => {
                if(err) {
                    reject(err);
                    return;
                }

                let {build, commit} = res;

                // Ensure the correct build was returned
                if(commit['branch'] !== ref) {
                    reject(new Error(`Incorrect build selected (expected: ${ref}, found: ${commit['branch']})`));
                    return;
                }

                log.debug(`[${module.name}] (Travis CI) State: ${build['state']}`);

                // Ensure build has finished
                if(['created', 'started'].indexOf(build['state']) >= 0) {
                    setTimeout(run, options.retryInterval);
                    return;
                }

                // Resolve with final state
                resolve(build['state']);
            });
        }

        run();
    });
}

function awaitBuild(log, module, ref, options) {
    // Retrieve travis status for `ref`
    return getTravisStatus(log, module, ref, options).then((status) => {
        let parameters = /https:\/\/travis-ci\.org\/.*?\/.*?\/builds\/(\d+)/.exec(status['target_url']);

        // Ensure parameters are valid
        if(IsNil(parameters) || parameters.length !== 2) {
            return Promise.reject(new Error(
                `Unknown travis status "target_url": "${status['target_url']}"`
            ));
        }

        // Await travis build to complete
        return awaitTravisBuild(log, module, ref, parameters[1]);
    });
}

function pushBranches(log, module, repository, remotes, commit, tag) {
    let branches = getTargetBranches(tag);

    // Push each branch to remote(s), and await build to complete
    return runSequential(branches, (branch) => {
        let startedAt = null;

        return runSequential(remotes, (remote) => {
            // Retrieve current remote commit (from local)
            return repository.revparse(`${remote}/${branch}`).catch(() => null).then((currentCommit) => {
                if(!IsNil(currentCommit) && currentCommit.trim() === commit) {
                    log.debug(`[${module.name}] ${tag} has already been pushed to "${branch}" on "${remote}"`);
                    return Promise.resolve();
                }

                log.debug(`[${module.name}] Pushing ${tag} to "${branch}" on "${remote}"`);

                if(remote === 'neapp') {
                    startedAt = Date.now();
                }

                // Push branch to remote
                return repository.push(remote, `+${tag}~0:refs/heads/${branch}`);
            });
        }).then(() => {
            if(IsNil(startedAt) || remotes.indexOf('neapp') < 0) {
                return Promise.resolve();
            }

            // Wait for build to complete
            return awaitBuild(log, module, branch, {
                sha: commit,
                createdAfter: startedAt
            }).then((state) => {
                if(state === 'failure') {
                    return Promise.reject(new Error(
                        `Build failed for ${module.name}#${branch}`
                    ));
                }

                // Build successful
                return Promise.resolve();
            });
        });
    });
}

function pushTag(log, module, repository, remotes, commit, tag) {
    // Push tag to remote
    return runSequential(remotes, (remote) => {
        log.debug(`[${module.name}] Pushing ${tag} tag to "${remote}"`);

        // Push tag to remote
        return repository.push(remote, `refs/tags/${tag}`);
    }).then(() => {
        if(remotes.indexOf('neapp') < 0) {
            return Promise.resolve();
        }

        // Wait for build to complete
        return awaitBuild(log, module, tag, {
            sha: commit,

            // Wait 15s before the first status request (hopefully enough time for the status to be updated)
            delay: 15 * 1000
        }).then((state) => {
            if(state === 'failure') {
                return Promise.reject(new Error(
                    `Build failed for ${module.name}#${tag}`
                ));
            }

            // Create release on GitHub
            if(module.type !== 'package') {
                return createRelease(log, module, repository, tag);
            }

            return Promise.resolve();
        });
    });
}

function pushRelease(log, browser, remotes) {
    if(IsString(remotes)) {
        remotes = [remotes];
    } else if(IsNil(remotes)) {
        remotes = ['bitbucket/neapp', 'neapp'];
    } else {
        return Promise.reject(`Invalid remote: ${remotes}`);
    }

    let repository = SimpleGit(browser.extension.path).silent(true);

    let modules = getPackages(browser);
    let pushed = {};

    // Retrieve current version
    return repository.raw(['describe', '--abbrev=0', '--match=v*', '--tags', '--exact-match']).then((tag) => {
        tag = tag.trim();

        // Validate version
        if(tag.length < 1 || tag.indexOf('v') !== 0 || !SemanticVersion.valid(tag)) {
            return Promise.reject(new Error(
                `Unable to push release, ${browser.extension.name} has an invalid version tag: ${tag}`
            ));
        }

        // Push release for each module
        return runSequential(modules, (module) => {
            let moduleRepository = SimpleGit(module.path).silent(true);

            // Retrieve current version
            return moduleRepository.raw([
                'describe', '--abbrev=0', '--match=v*', '--tags', '--exact-match'
            ]).then((moduleTag) => {
                moduleTag = moduleTag.trim();

                // Ignore modules with no release matching the `tag`
                if(moduleTag !== tag) {
                    return Promise.resolve();
                }

                // Resolve version commit sha
                return moduleRepository.revparse(`${tag}~0`).then((commit) => {
                    commit = commit.trim();

                    log.debug(`[${module.name}] Pushing ${tag} (${commit}) to remotes: ${remotes.join(', ')}`);

                    // Push release to remote(s)
                    return Promise.resolve()
                    // Push branches to remote(s)
                        .then(() => pushBranches(log, module, moduleRepository, remotes, commit, tag))
                        // Push tag to remote(s)
                        .then(() => pushTag(log, module, moduleRepository, remotes, commit, tag))
                        // Log result
                        .then(() => {
                            log.info(Chalk.green(`[${module.name}] Pushed ${tag} to: ${remotes.join(', ')}`));

                            // Mark module as pushed
                            pushed[module.name] = true;
                        });
                });
            }, () => {
                log.debug(`[${module.name}] No release available to push`);
            });
        }).then(() => {
            if(pushed[browser.extension.name] !== true) {
                log.debug(`[${browser.extension.name}] No release pushed, ignoring the generation of release notes`);
                return Promise.resolve();
            }

            // Update package release
            return updatePackageRelease(log, browser.extension, repository, modules, tag);
        });
    });
}

export const PushRelease = Task.create({
    name: 'release:push [remote]',
    description: 'Push release to remote(s).'
}, (log, browser, environment, {remote}) => {
    return pushRelease(log, browser, remote);
}, {
    remote: null
});

export default PushRelease;
