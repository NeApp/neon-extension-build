import Chalk from 'chalk';
import ChildProcess from 'child_process';
import Filesystem from 'fs-extra';
import Find from 'lodash/find';
import IsNil from 'lodash/isNil';
import Path from 'path';
import Remove from 'lodash/remove';
import SemanticVersion from 'semver';
import {detect as detectEditor} from 'open-in-editor/lib/editors/sublime';

import {GithubApi} from '../../../core/github';
import {runSequential} from '../../../core/helpers/promise';


const Editor = detectEditor().catch(() => null);

const GroupTitleRegex = /(Added|Changed|Fixed)\n/g;
const NotesRegex = /(((Added|Changed|Fixed)\n(\s*-\s.*\n)+\n*)+)/;

function extractReleaseNotes(message) {
    message = message.replace(/\r\n/g, '\n');

    // Find release notes
    let notes = NotesRegex.exec(message);

    if(IsNil(notes)) {
        return '';
    }

    return notes[0].trim();
}

function getReleaseNotes(module, tag) {
    return GithubApi.repos.getReleaseByTag({
        owner: 'RadonApp',
        repo: `radon-extension-${module.key}`,
        tag
    }).then(({data}) => {
        if(IsNil(data.body)) {
            return null;
        }

        // Retrieve release notes
        let body = data.body.trim();

        if(body.length < 1) {
            return null;
        }

        // Build release notes
        return (
            `### [${module.name}](https://github.com/RadonApp/radon-extension-${module.key}/releases/tag/${tag})\n\n` +
            `${body}`
        );
    }, () => {
        return null;
    });
}

function getReleaseNotesForModules(modules, tag) {
    return runSequential(modules, (module) => {
        if(module.type === 'package') {
            return Promise.resolve(null);
        }

        return getReleaseNotes(module, tag);
    });
}

function openEditor(module, notes) {
    let path = Path.join(module.path, 'TAG_MESSAGE');

    // Write release notes to path
    return Filesystem.writeFile(path, notes)
        // Detect editor path
        .then(() => Editor.then((cmd) => {
            if(IsNil(cmd)) {
                return Promise.reject('Unable to detect editor');
            }

            return cmd;
        }))
        // Open editor (to allow for the editing of release notes)
        .then((cmd) => new Promise((resolve, reject) => {
            ChildProcess.exec(`"${cmd}" --wait "${path}"`, (err) => {
                if(err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        }))
        // Read release notes from path
        .then(() => Filesystem.readFile(path, { encoding: 'utf8' }));
}

export function createRelease(log, module, repository, tag, options) {
    options = {
        dryRun: false,

        ...(options || {})
    };

    // Resolve immediately for dry runs
    if(options.dryRun) {
        log.info(`Creating release "${tag}" on "RadonApp/radon-extension-${module.key}" (skipped, dry run)`);
        return Promise.resolve();
    }

    // Retrieve tag details
    return GithubApi.repos.getReleaseByTag({
        owner: 'RadonApp',
        repo: `radon-extension-${module.key}`,
        tag
    }).catch(() => null).then((result) => {
        if(!IsNil(result)) {
            log.debug(`[${module.name}] Release already exists for "${tag}"`);
            return Promise.resolve();
        }

        // Retrieve tag message
        return repository.tag(['-l', '--format="%(contents)"', tag])
            // Extract release notes from tag message
            .then((message) =>
                extractReleaseNotes(message).replace(GroupTitleRegex, '**$1**\n\n')
            )
            // Open editor (to allow the editing of release notes)
            .then((notes) => openEditor(module, notes))
            // Create release
            .then((notes) => GithubApi.repos.createRelease({
                'owner': 'RadonApp',
                'repo': `radon-extension-${module.key}`,

                'tag_name': tag,
                'prerelease': !IsNil(SemanticVersion.prerelease(tag)),

                'name': tag,
                'body': notes
            }).then(() => {
                log.info(Chalk.green(`[${module.name}] Created release: ${tag}`));
            }));
    });
}

export function updatePackageRelease(log, extension, repository, modules, tag, options) {
    options = {
        dryRun: false,

        ...(options || {})
    };

    // Resolve immediately for dry runs
    if(options.dryRun) {
        log.info(`Updating package release "${tag}" on "RadonApp/radon-extension-${extension.key}" (skipped, dry run)`);
        return Promise.resolve();
    }

    // Retrieve tag details
    return GithubApi.repos.getReleases({
        'owner': 'RadonApp',
        'repo': `radon-extension-${extension.key}`,

        'per_page': 5
    }).then(({data: releases}) => {
        let release = Find(releases, (release) =>
            release.tag_name === tag
        );

        if(IsNil(release)) {
            return Promise.reject(new Error(`Unable to find "${tag}" release`));
        }

        if(!release.draft) {
            return Promise.reject(new Error(`Release "${tag}" has already been published`));
        }

        // Retrieve tag message
        return repository.tag(['-l', '--format="%(contents)"', tag])
            // Extract release notes from tag message
            .then((message) =>
                extractReleaseNotes(message).replace(GroupTitleRegex, '**$1**\n\n')
            )
            // Retrieve release notes for modules
            .then((notes) => getReleaseNotesForModules(modules, tag).then((moduleNotes) => {
                notes = [notes].concat(...moduleNotes);

                // Remove non-existent notes
                Remove(notes, (notes) => IsNil(notes) || notes.length < 1);

                // Join notes from all modules
                return notes.join('\n\n');
            }))
            // Open editor (to allow the editing of release notes)
            .then((notes) => openEditor(extension, notes))
            // Update release notes
            .then((notes) => GithubApi.repos.editRelease({
                'owner': 'RadonApp',
                'repo': `radon-extension-${extension.key}`,
                'id': release.id,

                'tag_name': tag,
                'prerelease': !IsNil(SemanticVersion.prerelease(tag)),

                'name': tag,
                'body': notes
            }).then(() => {
                log.info(Chalk.green(`[${extension.name}] Updated release: ${tag}`));
            }));
    }, (err) => {
        let details;

        try {
            details = JSON.parse(err);
        } catch(e) {
            log.debug(`[${extension.name}] Unable to parse error details: ${e}`);

            return Promise.reject(new Error(
                `Unable to retrieve release notes for "${tag}" on "RadonApp/radon-extension-${extension.key}"`
            ));
        }

        return Promise.reject(new Error(
            `Unable to retrieve release notes for "${tag}" on "RadonApp/radon-extension-${extension.key}"` +
            `: ${details.message}`
        ));
    });
}
