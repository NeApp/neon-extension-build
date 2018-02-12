import CloneDeep from 'lodash/cloneDeep';
import Credits from '@fuzeman/credits';
import Filesystem from 'fs-extra';
import Filter from 'lodash/filter';
import Get from 'lodash/get';
import IsNil from 'lodash/isNil';
import IsNumber from 'lodash/isNumber';
import IsPlainObject from 'lodash/isPlainObject';
import KeyBy from 'lodash/keyBy';
import Map from 'lodash/map';
import Merge from 'lodash/merge';
import OmitBy from 'lodash/omitBy';
import OrderBy from 'lodash/orderBy';
import Path from 'path';
import Pick from 'lodash/pick';
import Reduce from 'lodash/reduce';
import Uniq from 'lodash/uniq';

import Clean from '../../clean';
import {Task} from '../../../core/helpers';
import {sortKey} from '../../../core/helpers/value';


export const BaseAuthor = {
    name: null,
    email: null,
    type: null,

    commits: 0,

    modules: [],
    packages: []
};

export const Authors = Task.create({
    name: 'build:credits:authors',
    description: 'Build extension author credits.',

    required: [
        Clean
    ]
}, (log, browser, environment) => {
    let destinationPath = Path.join(environment.buildPath, 'unpacked', 'credits.json');

    // Retrieve credits, and write to the build directory
    return buildCredits(browser).then((credits) =>
        Filesystem.writeJson(destinationPath, credits, { spaces: 2 })
    );
});

function buildCredits(browser) {
    return Promise.all(Map(browser.modules, (module) =>
        getModuleCredits(module)
    )).then((modules) => {
        let credits = {};

        for(let i = 0; i < modules.length; i++) {
            for(let key in modules[i]) {
                if(!modules[i].hasOwnProperty(key)) {
                    continue;
                }

                // Merge module contributor with existing data
                credits[key] = mergeContributor({
                    ...CloneDeep(BaseAuthor),
                    ...credits[key]
                }, {
                    ...CloneDeep(BaseAuthor),
                    ...Pick(modules[i][key], Object.keys(BaseAuthor))
                });
            }
        }

        // Sort credits
        let result = OrderBy(Object.values(credits), [
            // Contributors
            'modules.length',
            'commits',

            // Package Authors and Maintainers
            'packages.length',
            (credit) => sortKey(credit.name)
        ], [
            'desc',
            'desc',
            'desc',
            'asc'
        ]);

        // Remove credits without any commits, modules or packages
        result = OmitBy(result, (credit) =>
            credit.commits < 1 &&
            credit.modules.length < 1 &&
            credit.packages.length < 1
        );

        // Remove credit properties with values: [], 0, null, undefined
        return Map(result, (credit) =>
            OmitBy(credit, (value) =>
                IsNil(value) ||
                (Array.isArray(value) && value.length < 1) ||
                (IsNumber(value) && value === 0)
            )
        );
    });
}

function getModuleCredits(module) {
    let result = KeyBy(Map(module.contributors, (contributor) => ({
        ...contributor,

        modules: [module.name],
        packages: []
    })), 'name');

    // Fetch package credits
    return getPackageCredits(module.path).then((credits) => {
        for(let type in credits) {
            if(!credits.hasOwnProperty(type)) {
                continue;
            }

            for(let i = 0; i < credits[type].length; i++) {
                let person = credits[type][i];

                if(!IsPlainObject(person)) {
                    continue;
                }

                if(IsNil(person.name) || person.name.length < 1) {
                    continue;
                }

                // Move "neon-extension-" packages to modules
                person.modules = Filter(person.packages, (name) =>
                    name.indexOf('neon-extension-') === 0
                );

                person.packages = Filter(person.packages, (name) =>
                    name.indexOf('neon-extension-') < 0
                );

                let key = person.name;

                // Include `person` in `result`
                if(IsNil(result[key])) {
                    result[key] = person;
                } else {
                    result[key] = {
                        ...Get(result, [key], {}),
                        ...person,

                        modules: [
                            ...Get(result, [key, 'modules'], []),
                            ...Get(person, 'modules', [])
                        ],

                        packages: [
                            ...Get(result, [key, 'packages'], []),
                            ...Get(person, 'packages', [])
                        ]
                    };
                }
            }
        }

        return result;
    });
}

function getPackageCredits(path) {
    function process(credits, initial) {
        return Reduce(credits, (result, value) => {
            if(Array.isArray(value)) {
                process(value, initial);
            } else {
                result.push(value);
            }

            return result;
        }, initial);
    }

    return Credits(path).then((credits) => ({
        bower: process(credits.bower, []),
        jspm: process(credits.jspm, []),
        npm: process(credits.npm, [])
    }));
}

function mergeContributor(a, b) {
    return Merge(a, {
        ...b,

        commits: a.commits + b.commits,

        modules: Uniq([
            ...a.modules,
            ...b.modules
        ]),

        packages: Uniq([
            ...a.packages,
            ...b.packages
        ])
    });
}

export default Authors;
