import KeyBy from 'lodash/keyBy';
import Map from 'lodash/map';
import Merge from 'lodash/merge';
import Path from 'path';
import SortBy from 'lodash/sortBy';

import Git from '../core/git';
import Json from '../core/json';
import {Task} from '../core/helpers';


function resolveContributors(path, existing) {
    return Git.contributors(path).then((current) =>
        SortBy(Object.values(Merge(
            KeyBy(existing, 'name'),
            KeyBy(current, 'name')
        )), 'commits')
    );
}

export function writeContributors(repository, path) {
    let contributorsPath = Path.join(path, 'contributors.json');

    // Read existing contributors from file
    return Json.read(contributorsPath)
        // Update contributors with current repository commits
        .then((existing) => resolveContributors(path, existing || []))
        // Write contributors to file
        .then((contributors) => Json.write(contributorsPath, contributors, { spaces: 2}));
}

function updatePackage(path) {
    return Git.status(path).then((repository) =>
        writeContributors(repository, path)
    );
}

function updateModules(modules) {
    return Promise.all(Map(modules, (module) =>
        writeContributors(module.repository, module.path)
    ));
}

export const Contributors = Task.create({
    name: 'contributors:update',
    description: 'Update module contributors.'
}, (log, browser, environment) => {
    // Update contributors
    return Promise.all([
        updatePackage(environment.builderPath),
        updateModules(browser.modules)
    ]);
});

export default Contributors;
