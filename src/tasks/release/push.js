import Chalk from 'chalk';
import Filter from 'lodash/filter';
import Find from 'lodash/find';
import IsNil from 'lodash/isNil';
import IsString from 'lodash/isString';
import Map from 'lodash/map';
import SemanticVersion from 'semver';
import SimpleGit from 'simple-git/promise';
import Travis from 'travis-ci';

import Github, {GithubApi} from '../../core/github';
import {Task} from '../../core/helpers';
import {createRelease, updatePackageRelease} from './core/release';
import {getPackages} from './core/helpers';
import {runSequential} from '../../core/helpers/promise';


const Remotes = [
    'bitbucket',
    'origin'
];

const travis = new Travis({
    version: '2.0.0'
});

export function getTargetBranches(tag) {
    let major = SemanticVersion.major(tag);
    let minor = SemanticVersion.minor(tag);
    let patch = SemanticVersion.patch(tag);
    let prerelease = SemanticVersion.prerelease(tag);

    // Build target branches
    let branches = [];

    // - Develop
    if(patch === 0) {
        branches.push('develop');
    }

    // - Release
    branches.push(`v${major}.${minor}`);

    // - Master
    if(IsNil(prerelease)) {
        branches.push('master');
    }

    return branches;
}

function getTravisStatus(log, module, ref, options) {
    options = {
        createdAfter: null,
        sha: null,

        delay: 30 * 1000,
        retryAttempts: 20,
        retryInterval: 15 * 1000,

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

            log.debug(
                `[${module.name}] (GitHub) Fetching the status of "${ref}" ` +
                `in "RadonApp/radon-extension-${module.key}"...`
            );

            // Retrieve combined status for `ref`
            GithubApi.repos.getCombinedStatusForRef({
                owner: 'RadonApp',
                repo: `radon-extension-${module.key}`,
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
            }, (err) => {
                log.warn(Chalk.yellow(`[${module.name}] (GitHub) Unable to fetch the status of "${ref}": ${err}`));

                // Reject promise with error
                reject(err);
            });
        }

        log.debug(`[${module.name}] Waiting ${Math.round(options.delay / 1000)} seconds...`);

        setTimeout(run, options.delay);
    });
}

function awaitTravisBuild(log, module, ref, id, options) {
    options = {
        maximumAttempts: 120,
        maximumInterval: 45 * 1000,

        ...(options || {})
    };

    return new Promise((resolve, reject) => {
        let attempts = 0;
        let interval = 15 * 1000;

        function run() {
            attempts++;

            if(attempts === 2) {
                log.info(`[${module.name}] Building "${ref}" on Travis CI... (2 ~ 5 minutes)`);
            }

            // Increase interval
            if(interval < options.maximumInterval) {
                interval = (15 + Math.floor(attempts / 5)) * 1000;
            }

            // Stop retrying after the maximum attempts have been reached
            if(attempts > options.maximumAttempts) {
                reject(new Error(`Build timeout for "${id}"`));
                return;
            }

            log.debug(`[${module.name}] (Travis CI) Fetching the state of build ${id}...`);

            // Retrieve build details for `id`
            travis.builds(id).get((err, res) => {
                if(err) {
                    log.warn(
                        `[${module.name}] (Travis CI) Error: ${(err && err.stack) ? err.stack : err} ` +
                        `(will try again in ${options.maximumInterval / 1000}s)`
                    );

                    // Back-off and try again at the maximum interval
                    setTimeout(run, options.maximumInterval);
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
                    setTimeout(run, interval);
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
    options = {
        dryRun: false,

        ...(options || {})
    };

    // Resolve immediately for dry runs
    if(options.dryRun) {
        log.info(`Waiting for "${ref}" on "RadonApp/${module.name}" to finish building (skipped, dry run)`);
        return Promise.resolve('success');
    }

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

function pushBranch(log, module, remotes, tag, branch, options) {
    options = {
        dryRun: false,

        ...(options || {})
    };

    let startedAt = null;

    return runSequential(remotes, (remote) => {
        // Retrieve current remote commit (from local)
        return module.repository.revparse(`${remote}/${branch}`).catch(() => null).then((currentCommit) => {
            if(!IsNil(currentCommit) && currentCommit.trim() === module.commit) {
                log.debug(`[${module.name}] ${tag} has already been pushed to "${branch}" on "${remote}"`);
                return Promise.resolve();
            }

            if(remote === 'origin') {
                startedAt = Date.now();
            }

            // Ignore push for dry runs
            if(!options.dryRun) {
                log.debug(`[${module.name}] Pushing ${tag} to "${branch}" on "${remote}"`);
            } else {
                log.debug(`[${module.name}] Pushing ${tag} to "${branch}" on "${remote}" (skipped, dry run)`);
                return Promise.resolve();
            }

            // Push branch to remote
            return module.repository.push(remote, `+${tag}~0:refs/heads/${branch}`);
        });
    }).then(() => {
        if(IsNil(startedAt) || remotes.indexOf('origin') < 0) {
            return Promise.resolve();
        }

        // Wait for build to complete
        return awaitBuild(log, module, branch, {
            dryRun: options.dryRun,
            sha: module.commit,
            createdAfter: startedAt
        }).then((state) => {
            if(state !== 'passed') {
                return Promise.reject(new Error(
                    `Build failed for ${module.name}#${branch}`
                ));
            }

            // Build successful
            return Promise.resolve();
        });
    });
}

function pushTag(log, module, remotes, tag, options) {
    options = {
        dryRun: false,

        ...(options || {})
    };

    // Push tag to remote
    return runSequential(remotes, (remote) => {
        if(!options.dryRun) {
            log.debug(`[${module.name}] Pushing ${tag} tag to "${remote}"`);
        } else {
            log.debug(`[${module.name}] Pushing ${tag} tag to "${remote}" (skipped, dry run)`);
            return Promise.resolve();
        }

        // Push tag to remote
        return module.repository.push(remote, `refs/tags/${tag}`);
    }).then(() => {
        if(remotes.indexOf('origin') < 0) {
            return Promise.resolve();
        }

        // Wait for build to complete
        return awaitBuild(log, module, tag, {
            dryRun: options.dryRun,
            sha: module.commit,

            // Wait 15s before the first status request (hopefully enough time for the status to be updated)
            delay: 15 * 1000
        }).then((state) => {
            if(state !== 'passed') {
                return Promise.reject(new Error(
                    `Build failed for ${module.name}#${tag}`
                ));
            }

            // Create release on GitHub
            if(module.type !== 'package') {
                return createRelease(log, module, module.repository, tag, {
                    dryRun: options.dryRun
                });
            }

            return Promise.resolve();
        });
    });
}

function pushRelease(log, browser, remotes, options) {
    let dryRun = options['dry-run'] || false;

    if(IsString(remotes)) {
        remotes = [remotes];
    } else if(IsNil(remotes)) {
        remotes = Remotes;
    } else if(!Array.isArray(remotes)) {
        return Promise.reject(`Invalid remotes: ${remotes}`);
    }

    let packageRepository = SimpleGit(browser.extension.path).silent(true);

    let modules = getPackages(browser);
    let pushed = {};

    // Retrieve current version
    return packageRepository.raw(['describe', '--abbrev=0', '--match=v*', '--tags', '--exact-match']).then((tag) => {
        tag = tag.trim();

        // Validate version
        if(tag.length < 1 || tag.indexOf('v') !== 0 || !SemanticVersion.valid(tag)) {
            return Promise.reject(new Error(
                `Unable to push release, ${browser.extension.name} has an invalid version tag: ${tag}`
            ));
        }

        // Resolve promise with package `tag`
        return tag;
    }, () => {
        return Promise.reject(new Error(
            'No release available to push'
        ));
    }).then((tag) => {
        // Resolve modules that match the package `tag`
        return runSequential(modules, (module) => {
            let repository = SimpleGit(module.path).silent(true);

            // Retrieve current version
            return repository.raw([
                'describe', '--abbrev=0', '--match=v*', '--tags', '--exact-match'
            ]).then((moduleTag) => {
                moduleTag = moduleTag.trim();

                // Ignore modules with no release matching the package `tag`
                if(moduleTag !== tag) {
                    return Promise.resolve();
                }

                // Resolve version commit sha
                return repository.revparse(`${tag}~0`).then((commit) => ({
                    key: module.key,
                    type: module.type,

                    name: module.name,
                    path: module.path,

                    commit: commit.trim(),
                    repository
                }));
            }, () => {
                log.warn(`[${module.name}] ${Chalk.yellow(
                    'No release available to push'
                )}`);
            });
        }).then((modules) =>
            // Remove ignored modules
            Filter(modules, (module) => !IsNil(module))
        ).then((modules) =>
            Promise.resolve()
                // Push branches to remote(s)
                .then(() => runSequential(getTargetBranches(tag), (branch) => Promise.all(Map(modules, (module) => {
                    log.info(
                        `[${module.name}] ${Chalk.cyan(
                            `Pushing ${tag} (${module.commit}) -> ${branch} (remotes: ${remotes.join(', ')})`
                        )}`
                    );

                    // Push branch for module to remote(s)
                    return pushBranch(log, module, remotes, tag, branch, { dryRun }).then(() => {
                        log.info(
                            `[${module.name}] ${Chalk.green(
                                `Pushed ${tag} (${module.commit}) -> ${branch} (remotes: ${remotes.join(', ')})`
                            )}`
                        );
                    });
                }))))
                // Push tag to remote(s)
                .then(() => Promise.all(Map(modules, (module) => {
                    log.info(
                        `[${module.name}] ${Chalk.cyan(
                            `Pushing ${tag} (${module.commit}) -> ${tag} (remotes: ${remotes.join(', ')})`
                        )}`
                    );

                    // Push tag for module to remote(s)
                    return pushTag(log, module, remotes, tag, { dryRun }).then(() => {
                        log.info(
                            `[${module.name}] ${Chalk.green(
                                `Pushed ${tag} (${module.commit}) -> ${tag} (remotes: ${remotes.join(', ')})`
                            )}`
                        );

                        // Mark module as pushed
                        pushed[module.name] = true;
                    });
                })))
        ).then(() => {
            if(pushed[browser.extension.name] !== true) {
                log.debug(`[${browser.extension.name}] No release pushed, ignoring the generation of release notes`);
                return Promise.resolve();
            }

            // Update package release
            return updatePackageRelease(log, browser.extension, packageRepository, modules, tag, { dryRun });
        });
    });
}

export const PushRelease = Task.create({
    name: 'release:push',
    description: 'Push release to remote(s).',

    command: (cmd) => (cmd
        .option('--dry-run', 'Don\'t execute any actions')
        .option('--remote <remote>', 'Remote [default: all]', Remotes)
    )
}, (log, browser, environment, {remote, ...options}) => {
    // Ensure account is authenticated
    return Github.isAuthenticated().then(() =>
        // Push release to GitHub
        pushRelease(log, browser, remote, options)
    );
}, {
    remote: null
});

export default PushRelease;
