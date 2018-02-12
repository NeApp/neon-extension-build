import Credits from '@fuzeman/credits';
import Filesystem from 'fs-extra';
import IsNil from 'lodash/isNil';
import Map from 'lodash/map';
import OrderBy from 'lodash/orderBy';
import Path from 'path';
import Reduce from 'lodash/reduce';

import Clean from '../../clean';
import {Task} from '../../../core/helpers';
import {sortKey} from '../../../core/helpers/value';


export const Libraries = Task.create({
    name: 'build:credits:libraries',
    description: 'Build extension library credits.',

    required: [
        Clean
    ]
}, (log, browser, environment) => {
    let destinationPath = Path.join(environment.buildPath, 'unpacked', 'libraries.json');

    // Retrieve libraries, and write to the build directory
    return buildLibraries(browser).then((libraries) =>
        Filesystem.writeJson(destinationPath, libraries, { spaces: 2 })
    );
});

function buildLibraries(browser) {
    return Promise.all(Map(browser.modules, (module) =>
        getPackageCredits(module.path)
    )).then((modules) => {
        let libraries = {};

        for(let i = 0; i < modules.length; i++) {
            for(let type in modules[i]) {
                if(!modules[i].hasOwnProperty(type)) {
                    continue;
                }

                for(let j = 0; j < modules[i][type].length; j++) {
                    let credit = modules[i][type][j];
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
        }

        // Order libraries by name
        return OrderBy(Map(Object.values(libraries), (library) => ({
            ...library,

            credits: Object.values(library.credits)
        })), [(library) =>
            sortKey(library.name)
        ], ['asc']);
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

export default Libraries;
