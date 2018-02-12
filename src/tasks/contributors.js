import KeyBy from 'lodash/keyBy';
import Map from 'lodash/map';
import Merge from 'lodash/merge';
import Path from 'path';
import SortBy from 'lodash/sortBy';

import Git from '../core/git';
import Json from '../core/json';
import {Task} from '../core/helpers';


export const Contributors = Task.create({
    name: 'contributors:update',
    description: 'Update module contributors.'
}, (log, browser, environment) => {
    // Update contributors
    return Promise.all([
        update(environment.builderPath),
        updateModules(browser.modules)
    ]);
});

function updateModules(modules) {
    return Promise.all(Map(modules, (module) =>
        update(module.path)
    ));
}

function update(path) {
    let contributorsPath = Path.join(path, 'contributors.json');

    // Read existing contributors from file
    return Json.read(contributorsPath)
        // Update contributors with current repository commits
        .then((existing) => updateContributors(path, existing || []))
        // Write contributors to file
        .then((contributors) => Json.write(contributorsPath, contributors, { spaces: 2}));
}

function updateContributors(path, existing) {
    return Git.contributors(path).then((current) =>
        SortBy(Object.values(Merge(
            KeyBy(existing, 'name'),
            KeyBy(current, 'name')
        )), 'commits')
    );
}

export default Contributors;
