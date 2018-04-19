import Https from 'https';
import Octokit from '@octokit/rest';
import Process from 'process';

import Vorpal from './vorpal';


export const GithubApi = Octokit();

if(Process.env['GITHUB_TOKEN']) {
    Vorpal.logger.info('Github: Authenticated');

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
            path: `/NeApp/${name}/tree/${branch}`
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

export default {
    exists
};
