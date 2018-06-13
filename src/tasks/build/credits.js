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
import Mkdirp from 'mkdirp';
import OmitBy from 'lodash/omitBy';
import OrderBy from 'lodash/orderBy';
import Path from 'path';
import Pick from 'lodash/pick';
import Reduce from 'lodash/reduce';
import Uniq from 'lodash/uniq';

import Json from '../../core/json';
import {Task} from '../../core/helpers';
import {sortKey} from '../../core/helpers/value';


export const BaseAuthor = {
    name: null,
    email: null,
    type: null,

    commits: 0,

    modules: [],
    packages: []
};

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

function getLibraries(modules) {
    let libraries = {};

    for(let i = 0; i < modules.length; i++) {
        for(let key in modules[i]) {
            if(!modules[i].hasOwnProperty(key)) {
                continue;
            }

            let credit = modules[i][key];
            let creditKey = sortKey(credit.name);

            if(IsNil(credit.name) || credit.name.length < 1) {
                continue;
            }

            if(IsNil(credit.packages)) {
                continue;
            }

            for(let h = 0; h < credit.packages.length; h++) {
                let library = credit.packages[h];
                let libraryKey = sortKey(library);

                if(IsNil(library)) {
                    continue;
                }

                // Ignore "neon-extension-" libraries
                if(library.indexOf('neon-extension-') === 0) {
                    continue;
                }

                // Ensure library exists
                if(IsNil(libraries[libraryKey])) {
                    libraries[libraryKey] = {
                        name: library,
                        credits: {}
                    };
                }

                // Add `credit` to library
                libraries[libraryKey].credits[creditKey] = {
                    name: credit.name,
                    email: credit.email
                };
            }
        }
    }

    // Order libraries by name
    return OrderBy(Map(Object.values(libraries), (library) => ({
        ...library,

        credits: Object.values(library.credits)
    })), [(library) =>
        sortKey(library.name)
    ], ['asc']);
}

function getPeople(modules) {
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
}

function fetchPackageCredits(path) {
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

function fetchCredits(name, path) {
    return Json.read(Path.join(path, 'contributors.json'), []).then((contributors) => {
        let result = KeyBy(Map(contributors, (contributor) => ({
            ...contributor,

            modules: [name],
            packages: []
        })), 'name');

        // Fetch package credits
        return fetchPackageCredits(path).then((credits) => {
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
    });
}

export const CreditsTask = Task.create({
    name: 'build:credits',
    description: 'Build extension credits.',

    required: [
        'clean',
        'module:validate'
    ]
}, (log, browser, environment) => {
    let basePath = Path.join(environment.outputPath, 'Resources');

    // Ensure output directory exists
    Mkdirp.sync(basePath);

    // Build list of packages
    let modules = Object.values(browser.modules).concat([
        { name: 'neon-extension-build', path: environment.builderPath }
    ]);

    // Fetch module credits
    return Promise.all(Map(modules, (pkg) => {
        log.debug(`Fetching credits for "${pkg.name}"...`);

        return fetchCredits(pkg.name, pkg.path);
    })).then((modules) => {
        let credits = {
            libraries: getLibraries(modules),
            people: getPeople(modules)
        };

        log.debug(
            `Writing credits for ${modules.length} module(s) ` +
            `[${credits.libraries.length} libraries, ${credits.people.length} people]`
        );

        // Write credits to build directory
        return Filesystem.writeJson(Path.join(basePath, 'credits.json'), credits, {
            spaces: 2
        });
    });
});

export default CreditsTask;
