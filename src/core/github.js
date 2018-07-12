import Https from 'https';
import Octokit from '@octokit/rest';
import Process from 'process';

import Vorpal from './vorpal';
import IsNil from 'lodash/isNil';


export const GithubApi = Octokit();

if(Process.env['GITHUB_TOKEN']) {
    GithubApi.authenticate({
        type: 'token',
        token: Process.env['GITHUB_TOKEN']
    });
}

export function exists(name, branch) {
    return new Promise((resolve, reject) => {
        let req = Https.request({
            method: 'HEAD',
            protocol: 'https:',
            hostname: 'github.com',
            port: 443,
            path: `/RadonApp/${name}/tree/${branch}`
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

export function isAuthenticated() {
    return GithubApi.orgs.get({ org: 'RadonApp' }).then(({ headers }) => {
        if(IsNil(headers['x-oauth-scopes'])) {
            return Promise.reject(new Error(
                'GitHub: No authentication token provided'
            ));
        }

        if(headers['x-oauth-scopes'].indexOf('repo') < 0) {
            return Promise.reject(new Error(
                'GitHub: No "repo" access'
            ));
        }

        return true;
    }, (err) => {
        if(IsNil(err) || IsNil(err.code)) {
            return Promise.reject(new Error(
                `GitHub: ${err.message || err}`
            ));
        }

        // Return API Error
        try {
            let data = JSON.parse(err.message);

            if(!IsNil(data.message) && data.message.length > 0) {
                return Promise.reject(new Error(
                    `GitHub: ${data.message}`
                ));
            }
        } catch(e) {
            Vorpal.logger.debug(`Unable to parse error: ${err.message}`);
        }

        return Promise.reject(new Error(
            `GitHub: ${err.message || err}`
        ));
    });
}

export default {
    exists,
    isAuthenticated
};
