import Chalk from 'chalk';
import ChildProcess from 'child_process';
import Filesystem from 'fs-extra';
import IsNil from 'lodash/isNil';
import Path from 'path';
import Remove from 'lodash/remove';
import SemanticVersion from 'semver';
import {detect as detectEditor} from 'open-in-editor/lib/editors/sublime';

import {GithubApi} from '../../../core/github';
import {runSequential} from '../../../core/helpers/promise';


const Editor = detectEditor();

const GroupTitleRegex = /(Added|Changed|Fixed)\n/g;
const NotesRegex = /(((Added|Changed|Fixed)\n( - .*\n)+\n?)+)/;

function extractReleaseNotes(message) {
    message = message.replace(/\r\n/g, '\n');

    // Find release notes
    let notes = NotesRegex.exec(message);

    if(IsNil(notes)) {
        throw new Error(
            `Unable to find release notes for ${module.name}`
        );
    }

    return notes[0];
}

function getReleaseNotes(module, tag) {
    return GithubApi.repos.getReleaseByTag({
        owner: 'NeApp',
        repo: module.name,
        tag
    }).then(({data}) => {
        return (
            `### [${module.name}](https://github.com/NeApp/${module.name}/releases/tag/${tag})\n\n` +
            `${data.body}`
        );
    }, () => {
        return null;
    });
}

function getReleaseNotesForModules(modules, tag) {
    return runSequential(modules, (module) =>
        getReleaseNotes(module, tag)
    );
}

function openEditor(module, notes) {
    let path = Path.join(module.path, 'TAG_MESSAGE');

    // Write release notes to path
    return Filesystem.writeFile(path, notes)
        // Detect editor path
        .then(() => Editor)
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

export function createRelease(log, module, repository, tag) {
    return GithubApi.repos.getReleaseByTag({
        owner: 'NeApp',
        repo: module.name,
        tag
    }).catch(() => null).then((result) => {
        if(!IsNil(result)) {
            log.debug(`[${module.name}] Release already exists for "${tag}"`);
            return Promise.resolve();
        }

        // Retrieve tag message
        return repository.tag(['-l', '--format="%(contents)"', tag])
            // Extract release notes from tag message
            .then((message) => {
                let notes = extractReleaseNotes(message);

                // Update group titles
                return notes.replace(GroupTitleRegex, '**$1**\n\n');
            })
            // Open editor (to allow the editing of release notes)
            .then((notes) => openEditor(module, notes))
            // Create release
            .then((notes) => GithubApi.repos.createRelease({
                'owner': 'NeApp',
                'repo': module.name,

                'tag_name': tag,
                'target_commitish': tag,
                'prerelease': !IsNil(SemanticVersion.prerelease(tag)),

                'name': tag,
                'body': notes
            }).then(() => {
                log.info(Chalk.green(`[${module.name}] Created release: ${tag}`));
            }));
    });
}

export function updatePackageRelease(log, extension, repository, modules, tag) {
    return GithubApi.repos.getReleaseByTag({
        owner: 'NeApp',
        repo: extension.name,
        tag
    }).then(({data}) => {
        // Retrieve tag message
        return repository.tag(['-l', '--format="%(contents)"', tag])
            // Extract release notes from tag message
            .then((message) =>
                extractReleaseNotes(message).replace(GroupTitleRegex, '**$1**\n\n')
            )
            // Retrieve release notes for modules
            .then((notes) => getReleaseNotesForModules(modules).then((moduleNotes) => {
                Remove(moduleNotes, IsNil);

                return notes.concat(...moduleNotes);
            }))
            // Open editor (to allow the editing of release notes)
            .then((notes) => openEditor(extension, notes))
            // Update release notes
            .then((notes) => GithubApi.repos.editRelease({
                'id': data.id,

                'owner': 'NeApp',
                'repo': module.name,

                'tag_name': tag,
                'target_commitish': tag,
                'prerelease': !IsNil(SemanticVersion.prerelease(tag)),

                'name': tag,
                'body': notes
            }).then(() => {
                log.info(Chalk.green(`[${extension.name}] Created release: ${tag}`));
            }));
    }, (err) => {
        let details;

        try {
            details = JSON.parse(err);
        } catch(e) {
            log.debug(`[${extension.name}] Unable to parse error details: ${e}`);

            return Promise.reject(new Error(
                `Unable to retrieve release notes for "${tag}" on "${extension.name}"`
            ));
        }

        return Promise.reject(new Error(
            `Unable to retrieve release notes for "${tag}" on "${extension.name}": ${details.message}`
        ));
    });
}
