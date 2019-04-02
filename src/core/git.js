import Chalk from 'chalk';
import Filesystem from 'fs';
import IsNil from 'lodash/isNil';
import Path from 'path';
import SimpleGit from 'simple-git';
import SortBy from 'lodash/sortBy';
import Util from 'util';

import Vorpal from './vorpal';


const Logger = Vorpal.logger;

export class Git {
    clean(path, options) {
        options = {
            debug: false,

            ...(options || {})
        };

        Logger.debug(`Cleaning repository: ${path} ${Util.inspect(options)}`);

        // Create repository instance
        let repository = SimpleGit(path).silent(!options.debug);

        // Stage files (ignore line ending changes)
        return this._stageAll(repository)
            // Return repository status
            .then(() => this._getStatus(repository));
    }

    clone(path, repoPath, localPath, options) {
        return new Promise((resolve, reject) => {
            // Clone repository to `path`
            SimpleGit(path).silent(true).clone(repoPath, localPath, options, (err) => {
                if(err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    contributors(path) {
        let repository = SimpleGit(path).silent(true);

        // Retrieve repository commits
        return this._getCommits(repository).then((commits) => {
            let contributorsMap = {};

            for(let i = 0; i < commits.all.length; i++) {
                let commit = commits.all[i];

                if(IsNil(contributorsMap[commit.author_email])) {
                    // Create contributor
                    contributorsMap[commit.author_email] = {
                        name: commit.author_name,
                        email: commit.author_email,

                        commits: 0
                    };
                }

                // Update contributor commit count
                contributorsMap[commit.author_email].commits += 1;
            }

            // Sort contributors by commit count
            return SortBy(Object.values(contributorsMap), 'commits');
        });
    }

    status(path, options) {
        options = {
            debug: false,

            ...(options || {})
        };

        Logger.debug(`Fetching status of repository: ${path} ${Util.inspect(options)}`);

        // Ensure repository exists
        if(!Filesystem.existsSync(Path.join(path, '.git'))) {
            Logger.warn(Chalk.yellow(`No repository available at: ${path}`));
            return Promise.resolve({});
        }

        // Create repository instance
        let repository = SimpleGit(path).silent(!options.debug);

        // Retrieve repository status
        return Promise.resolve({})
            // Retrieve current version
            .then((result) => this._getTag(repository).then((tag) => ({
                ...result,

                tag: tag || null
            }), () => ({
                tag: null
            })))
            // Retrieve latest version
            .then((result) => this._getTag(repository, false).then((tag) => ({
                ...result,

                latestTag: tag || null
            }), () => ({
                latestTag: null
            })))
            // Retrieve commits since latest version
            .then((result) => this._getCommits(repository, result.latestTag).then((commits) => ({
                ...result,

                ahead: commits.total
            }), () => ({
                ...result,

                ahead: 0
            })))
            // Retrieve latest commit hash
            .then((result) => this._resolveHash(repository).then((commit) => ({
                ...result,

                commit
            }), () => ({
                ...result,

                commit: null
            })))
            // Retrieve status
            .then((result) => this._getStatus(repository).then((status) => ({
                ...result,

                branch: status.current,
                dirty: status.files.length > 0
            }), () => ({
                ...result,

                branch: null,
                dirty: false
            })));
    }

    _getCommits(repository, from = null, to = 'HEAD') {
        return new Promise((resolve, reject) => {
            repository.log({ from, to }, (err, commits) => {
                if(err) {
                    reject(err);
                    return;
                }

                resolve(commits);
            });
        });
    }

    _getTag(repository, exact = true) {
        return new Promise((resolve, reject) => {
            let args = [
                'describe',
                '--abbrev=0',
                '--match=v*',
                '--tags'
            ];

            if(exact) {
                args.push('--exact-match');
            }

            repository.raw(args, (err, description) => {
                if(err) {
                    reject(err);
                    return;
                }

                if(!IsNil(description) && description.length > 0) {
                    resolve(description.trim());
                } else {
                    resolve(null);
                }
            });
        });
    }

    _getStatus(repository) {
        return new Promise((resolve, reject) => {
            repository.status((err, status) => {
                if(err) {
                    reject(err);
                    return;
                }

                resolve(status);
            });
        });
    }

    _resolveHash(repository, name = 'HEAD') {
        return new Promise((resolve, reject) => {
            repository.revparse([name], (err, hash) => {
                if(err) {
                    reject(err);
                    return;
                }

                if(!IsNil(hash) && hash.length > 0) {
                    resolve(hash.trim());
                } else {
                    resolve(null);
                }
            });
        });
    }

    _stageAll(repository) {
        return new Promise((resolve, reject) => {
            let args = [
                'add',
                '--all'
            ];

            repository.raw(args, (err) => {
                if(err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }
}

export default new Git();
