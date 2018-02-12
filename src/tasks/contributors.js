import Filesystem from 'fs-extra';
import KeyBy from 'lodash/keyBy';
import Map from 'lodash/map';
import Merge from 'lodash/merge';
import Path from 'path';
import SortBy from 'lodash/sortBy';

import Git from '../core/git';
import {Task} from '../core/helpers';


export const Contributors = Task.create({
    name: 'contributors:update',
    description: 'Update module contributors.'
}, (log, browser, environment) => {
    // Update module contributors
    return Promise.all(Map(browser.modules, (module) => {
        let contributorsPath = Path.join(module.path, 'contributors.json');

        // Read contributors from file
        return Filesystem.readJson(contributorsPath, { throws: false })
            // Update contributors with current repository commits
            .then((existing) => updateContributors(module, existing || []))
            // Write contributors to file
            .then((contributors) => Filesystem.writeJson(contributorsPath, contributors, { spaces: 2}));
    }));
});

export function updateContributors(module, existing) {
    return Git.contributors(module.path).then((current) =>
        SortBy(Object.values(Merge(
            KeyBy(existing, 'name'),
            KeyBy(current, 'name')
        )), 'commits')
    );
}

export default Contributors;
