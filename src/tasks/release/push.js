import Chalk from 'chalk';
import Find from 'lodash/find';
import IsNil from 'lodash/isNil';
import IsString from 'lodash/isString';
import SemanticVersion from 'semver';
import SimpleGit from 'simple-git/promise';

import {GithubApi} from '../../core/github';
import {Task} from '../../core/helpers';
import {getPackages} from './core/helpers';
import {runSequential} from '../../core/helpers/promise';


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

function hasTravisStatus(statuses) {
    return !IsNil(Find(statuses, {
        context: 'continuous-integration/travis-ci/push'
    }));
}

function awaitBuild(log, module, ref, commit) {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        function next() {
            attempts++;

            // Retrieve status for `ref`
            GithubApi.repos.getCombinedStatusForRef({
                owner: 'NeApp',
                repo: module.name,
                ref
            }).then(({data}) => {
                if(data.sha === commit && hasTravisStatus(data.statuses) && data.state !== 'pending') {
                    resolve(data);
                    return;
                }

                if(data.sha !== commit) {
                    if(attempts > 6) {
                        reject(new Error(`Commit doesn\'t exist for ${module.name} (after 1m)`));
                        return;
                    }

                    log.debug(`[${module.name}] Commit doesn\'t exist, found: ${data.sha}`);
                } else if(!hasTravisStatus(data.statuses)) {
                    if(attempts > 12) {
                        reject(new Error(`Build wasn\'t created for ${module.name} (after 2m)`));
                        return;
                    }

                    log.debug(`[${module.name}] Waiting for build to be created...`);
                } else if(data.state === 'pending') {
                    if(attempts > 60) {
                        reject(new Error(`Build timeout for ${module.name} (after 10m)`));
                        return;
                    }

                    log.debug(`[${module.name}] Waiting for build to complete...`);
                }

                // Retry in 10 seconds
                setTimeout(next, 10 * 1000);
            });
        }

        log.info(`[${module.name}] Building on Travis CI... (2 ~ 5 minutes)`);

        next();
    });
}

function pushBranches(log, module, repository, remotes, commit, tag) {
    let branches = getTargetBranches(tag);

    // Push each branch to remote(s), and await build to complete
    return runSequential(branches, (branch) => {
        return runSequential(remotes, (remote) => {
            log.debug(`[${module.name}] Pushing ${tag} to "${branch}" on "${remote}"`);

            // Push branch to remote
            return repository.push(remote, `${tag}:${branch}`);
        }).then(() => {
            if(remotes.indexOf('neapp') < 0) {
                return Promise.resolve();
            }

            // Wait for build to complete
            return awaitBuild(log, module, branch, commit).then(({state}) => {
                if(state === 'failure') {
                    return Promise.reject(new Error(
                        `Build failed for ${module.name}#${branch}`
                    ));
                }

                // Build successful
                return Promise.resolve();
            })
        });
    });
}

function pushTag(log, module, repository, remotes, commit, tag) {
    return runSequential(remotes, (remote) => {
        log.debug(`[${module.name}] Pushing ${tag} tag to "${remote}"`);

        // Push tag to remote
        return repository.push(remote, `refs/tags/${tag}`);
    }).then(() => {
        if(remotes.indexOf('neapp') < 0) {
            return Promise.resolve();
        }

        // Wait for build to complete
        return awaitBuild(log, module, tag, commit).then(({state}) => {
            if(state === 'failure') {
                return Promise.reject(new Error(
                    `Build failed for ${module.name}#${tag}`
                ));
            }

            // Build successful
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

    return runSequential(getPackages(browser), (module) => {
        let repository = SimpleGit(module.path).silent(true);

        log.debug(`[${module.name}] Pushing to remotes: ${remotes.join(', ')}`);

        // Retrieve current version
        return repository.raw(['describe', '--abbrev=0', '--match=v*', '--tags', '--exact-match']).then((tag) => {
            tag = tag.trim();

            // Validate version
            if(tag.length < 1 || tag.indexOf('v') !== 0 || !SemanticVersion.valid(tag)) {
                return Promise.reject(new Error(
                    `Unable to push release, ${module.name} has an invalid version tag: ${tag}`
                ));
            }

            // Resolve version commit sha
            return repository.revparse(tag).then((commit) => {
                log.debug(`[${module.name}] Pushing ${tag} (${commit}) to remotes: ${remotes.join(', ')}`);

                // Push release to remote(s)
                return Promise.resolve()
                    // Push branches to remote(s)
                    .then(() => pushBranches(log, module, repository, remotes, commit, tag))
                    // Push tag to remote(s)
                    .then(() => pushTag(log, module, repository, remotes, commit, tag))
                    // Log result
                    .then(() => {
                        log.info(Chalk.green(`[${module.name}] Pushed ${tag} to: ${remotes.join(', ')}`));
                    });
            });
        }, () => {
            log.debug(`[${module.name}] No release available to push`);
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
