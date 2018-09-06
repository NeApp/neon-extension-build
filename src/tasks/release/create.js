import Chalk from 'chalk';
import CloneDeep from 'lodash/cloneDeep';
import Filesystem from 'fs-extra';
import Filter from 'lodash/filter';
import IsEqual from 'lodash/isEqual';
import IsNil from 'lodash/isNil';
import IsPlainObject from 'lodash/isPlainObject';
import Map from 'lodash/map';
import OmitBy from 'lodash/omitBy';
import Path from 'path';
import SemanticVersion from 'semver';
import SimpleGit from 'simple-git/promise';

import Git from '../../core/git';
import {Task} from '../../core/helpers';
import {getPackages} from './core/helpers';
import {runSequential} from '../../core/helpers/promise';
import {updatePackage, writePackageLocks} from '../../core/package';
import {writeContributors} from '../contributors';


export const ReleaseFiles = [
    'contributors.json',
    'package.json',
    'package-lock.json'
];

function isPatchRelease(current, next) {
    return (
        // Major + Minor
        SemanticVersion.major(current) === SemanticVersion.major(next) &&
        SemanticVersion.minor(current) === SemanticVersion.minor(next) &&

        // Pre-release
        IsNil(SemanticVersion.prerelease(current)) === IsNil(SemanticVersion.prerelease(next))
    );
}

function createReleases(log, browser, version, options) {
    if(options.commit === false) {
        log.info('Creating releases... (skipped)');
        return Promise.resolve();
    }

    log.debug('Creating releases...');

    // Create releases for each module with changes
    return runSequential(getPackages(browser), (module) => {
        let repository = SimpleGit(module.path).silent(true);

        return repository.status().then((status) => {
            if(status.files.length < 1) {
                if(!options.force) {
                    return Promise.resolve();
                }

                // Display warning
                log.warn(Chalk.yellow(
                    `[${module.name}] Repository has no changes`
                ));
            }

            // Create release
            return Promise.resolve()
                // Commit changes
                .then(() => {
                    let files = Filter(ReleaseFiles, (name) =>
                        Filesystem.existsSync(Path.join(module.path, name))
                    );

                    log.debug(`[${module.name}] Committing changes... (files: ${files.join(', ')})`);

                    // Commit changes to repository
                    return repository.commit(`Bumped version to ${version}`, files).then((summary) => {
                        log.info(Chalk.green(`[${module.name}] Committed changes (${summary.commit})`));
                    });
                })
                // Retrieve commits since the latest version
                .then(() => repository.raw(['describe', '--abbrev=0', '--match=v*', '--tags']).then((latestTag) =>
                    repository.log({ from: latestTag.trim(), to: 'HEAD^'})
                ))
                // Write tag message to file
                .then((commits) => {
                    let lines = [
                        `Release ${version}\n`,

                        // Release notes
                        '# Added',
                        '#  - ',
                        '#',
                        '# Changed',
                        '#  - ',
                        '#',
                        '# Fixed',
                        '#  - ',
                        '#',

                        // Commits since the previous release
                        '# Commits:'
                    ];

                    // Append commits
                    lines = lines.concat(Map(commits.all, (commit) =>
                        `# (${commit.date}) [${commit.hash.substring(0, 7)}] ${commit.message}`
                    ));

                    // Write to temporary file
                    return Filesystem.writeFile(Path.join(module.path, 'TAG_MESSAGE'), lines.join('\n'));
                })
                // Create tag
                .then(() => {
                    log.debug(`[${module.name}] Creating tag: v${version}`);

                    // Create tag in repository
                    return repository.tag([
                        '-a', '-s', '-e',
                        '-F', Path.join(module.path, 'TAG_MESSAGE'),
                        `v${version}`
                    ]).then(() => {
                        log.info(Chalk.green(`[${module.name}] Created tag: v${version}`));
                    });
                });
        });
    });
}

function updateContributors(log, browser, options) {
    log.debug('Updating contributors...');

    // Update contributors for each module with changes
    return runSequential(getPackages(browser), (module) => {
        // Retrieve module repository status
        return Git.status(module.path).then((repository) => {
            if(!repository.dirty) {
                if(!options.force) {
                    return Promise.resolve();
                }

                // Display warning
                log.warn(Chalk.yellow(
                    `[${module.name}] Repository has no changes`
                ));
            }

            // Update module contributors
            return writeContributors(repository, module.path).then(() => {
                log.info(Chalk.green(`[${module.name}] Updated contributors`));
            });
        });
    });
}

function updatePackages(log, browser, version, options) {
    let versions = {};

    log.debug('Updating packages...');

    // Update package metadata for each module
    return runSequential(getPackages(browser), (module) => {
        let pkg = CloneDeep(module.package);

        // Ensure package metadata exists
        if(IsNil(pkg)) {
            if(!options.force) {
                return Promise.reject(Chalk.red(
                    `Unable to create release, ${module.name} has no package metadata`
                ));
            }

            // Display warning
            log.warn(Chalk.yellow(
                `[${module.name}] Module has no package metadata`
            ));

            // Ignore module
            return Promise.resolve();
        }

        // Ensure the repository isn't dirty
        if(module.repository.dirty) {
            if(!options.force) {
                return Promise.reject(Chalk.red(
                    `Unable to create release, ${module.name} has uncommitted changes`
                ));
            }

            // Display warning
            log.warn(Chalk.yellow(
                `[${module.name}] Repository has uncommitted changes`
            ));
        }

        function formatVersion(version, name) {
            name = name.replace('@radon-extension/', 'radon-extension-');

            if(module.type === 'package') {
                return `file:${name}-${version}.tgz`;
            }

            // Return patch release range (^1.0, or ^v1.0.0-beta)
            return `^${version.substring(0, version.lastIndexOf('.'))}`;
        }

        // Update module versions in [package-lock.json]
        return writePackageLocks(module.path, versions, { formatVersion }).then((dependenciesChanged) => {
            // Update package dependencies
            dependenciesChanged = !IsEqual(CloneDeep(pkg), updatePackage(pkg, versions, {
                formatVersion
            })) || dependenciesChanged;

            if(dependenciesChanged) {
                log.debug(`[${module.name}] Dependencies changed`);
            }

            // Only create patch releases on modules with changes
            if(dependenciesChanged || module.repository.ahead > 0 || !isPatchRelease(pkg.version, version)) {
                // Ensure version has been incremented
                if(SemanticVersion.lte(version, pkg.version)) {
                    if(!options.force) {
                        return Promise.reject(Chalk.red(
                            `Unable to create release, target version (${version}) should be later than the current ` +
                            `${module.name} version: ${pkg.version}`
                        ));
                    }

                    // Display warning
                    log.warn(Chalk.yellow(
                        `[${module.name}] Target version (${version}) should be later than the ` +
                        `current version: ${pkg.version}`
                    ));
                }

                log.info(Chalk.green(`[${module.name}] Version changed to: ${version}`));

                // Update version
                pkg.version = version;

                // Store module version
                versions[module.name] = version;
            } else {
                log.debug(`[${module.name}] Version: ${pkg.version}`);

                // Store module version
                versions[module.name] = pkg.version;

                // No changes
                if(!options.force) {
                    return Promise.resolve();
                }
            }

            // Write package version to [package-lock.json]
            return writePackageLocks(module.path, {
                [module.name]: pkg.version
            }).then(() => {
                // Read package metadata from file (to determine the current EOL character)
                let path = Path.join(module.path, 'package.json');

                return Filesystem.readFile(path).then((data) =>
                    // Write package metadata to file
                    Filesystem.writeJson(path, OmitBy(pkg, (value) => {
                        if(IsNil(value)) {
                            return true;
                        }

                        if(IsPlainObject(value) && Object.keys(value).length < 1) {
                            return true;
                        }

                        return false;
                    }), {
                        EOL: data.indexOf('\r\n') >= 0 ? '\r\n' : '\n',
                        spaces: 2
                    })
                );
            });
        });
    });
}

export const CreateRelease = Task.create({
    name: 'release:create <version>',
    description: 'Create release.',

    command: (cmd) => (cmd
        .option('--force', 'Create release (ignoring all violations).')
        .option('--no-commit', 'Do not commit changes')
    )
}, (log, browser, environment, {version, ...options}) => {
    // Ensure the provided `version` is valid
    if(version.length < 1 || version.indexOf('v') === 0 || !SemanticVersion.valid(version)) {
        return Promise.reject(new Error(`Invalid version: ${version}`));
    }

    // Create release
    return Promise.resolve()
        // Update packages (set version, and update dependencies)
        .then(() => updatePackages(log, browser, version, options))
        // Update contributors (on updated packages)
        .then(() => updateContributors(log, browser, options))
        // Create releases (commit, and tag version)
        .then(() => createReleases(log, browser, version, options));
}, {
    force: false,
    version: null
});

export default CreateRelease;
