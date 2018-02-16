import Filesystem from 'fs-extra';
import Path from 'path';

import Clean from '../clean';
import {Task} from '../../core/helpers';


function createDescriptor(browser) {
    if(browser.dirty) {
        return Promise.reject(new Error(
            'Unable to create bintray descriptor, environment is dirty'
        ));
    }

    return Promise.resolve({
        'package': {
            'name': browser.extension.package.name,
            'licenses': ['GPL-3.0'],

            'subject': 'neapp',
            'repo': 'neon-extension',

            'vcs_url': `https://github.com/NeApp/${browser.extension.package.name}.git`
        },

        'version': {
            'name': browser.versionName,
            'vcs_tag': browser.extension.tag,

            'attributes': [
                {'name': 'branch', 'type': 'string', 'values': [browser.extension.branch]},
                {'name': 'commit', 'type': 'string', 'values': [browser.extension.commit]},
                {'name': 'version', 'type': 'string', 'values': [browser.version]},

                {'name': 'build_number', 'type': 'number', 'values': [parseInt(browser.extension.travis.number, 10)]}
            ]
        },

        'files': [
            {
                'includePattern': 'build/production/(.*\\.zip)',
                'uploadPattern': '$1',
                'matrixParams': {
                    'override': 1
                }
            },
            {
                'includePattern': 'build/production/(MD5SUMS|webpack.*)',
                'uploadPattern': `Neon-${browser.title}-${browser.versionName}/$1`,
                'matrixParams': {
                    'override': 1
                }
            }
        ],

        'publish': true
    });
}

export const Bintray = Task.create({
    name: 'deploy:bintray',
    description: 'Create bintray descriptor for the built extension.',

    required: [
        Clean
    ]
}, (log, browser, environment) => {
    // Write bintray descriptor to file
    return createDescriptor(browser).then((descriptor) =>
        Filesystem.writeJson(Path.join(environment.buildPath, 'bintray.json'), descriptor, {
            spaces: 2
        })
    );
});

export default Bintray;
