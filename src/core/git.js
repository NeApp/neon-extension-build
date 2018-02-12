import Filesystem from 'fs';
import IsNil from 'lodash/isNil';
import Path from 'path';
import SimpleGit from 'simple-git';
import SortBy from 'lodash/sortBy';


export class Git {
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

    status(path) {
        // Ensure repository exists
        if(!Filesystem.existsSync(Path.join(path, '.git'))) {
            return Promise.resolve({});
        }

        // Create repository instance
        let repository = SimpleGit(path).silent(true);

        // Retrieve repository status
        return Promise.resolve()
            // Retrieve latest version
            .then(() => this._getCurrentTag(repository).then((tag) => ({
                tag: tag
            }), () => ({
                tag: null
            })))

            // Retrieve commits since latest version
            .then((result) => this._getCommits(repository, result.tag).then((commits) => ({
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

    _getCurrentTag(repository) {
        return new Promise((resolve, reject) => {
            repository.raw([
                'describe',
                '--exact-match',
                '--abbrev=0',
                '--match=v*',
                '--tags'
            ], (err, description) => {
                if(err) {
                    reject(err);
                    return;
                }

                resolve(description.trim());
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

                resolve(hash.trim());
            });
        });
    }
}

export default new Git();
