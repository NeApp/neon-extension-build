import CloneDeep from 'lodash/cloneDeep';
import Filesystem from 'fs-extra';
import Filter from 'lodash/filter';
import ForEach from 'lodash/forEach';
import IsNil from 'lodash/isNil';
import Map from 'lodash/map';
import OmitBy from 'lodash/omitBy';
import Path from 'path';
import Pick from 'lodash/pick';
import Reduce from 'lodash/reduce';
import Remove from 'lodash/remove';
import Uniq from 'lodash/uniq';

import Clean from '../clean';
import Extension from './extension';
import {Task} from '../../core/helpers';


function getExtensionManifest(browser) {
    let permissions = [
        ...browser.extension.manifest.origins,
        ...browser.extension.manifest.permissions
    ];

    let optionalPermissions = [
        ...browser.extension.manifest.optional_origins,
        ...browser.extension.manifest.optional_permissions
    ];

    return {
        'manifest_version': 2,

        'applications': null,

        'name': browser.extension.title,
        'version': browser.version,
        'version_name': null,

        'description': null,
        'icons': {},

        'permissions': permissions,
        'optional_permissions': optionalPermissions,

        'background': {},
        'content_scripts': [],
        'options_ui': {},
        'web_accessible_resources': [],

        // Include version name
        ...(browser.includeVersionName && {
            'version_name': browser.versionName
        }),

        // Include extension manifest properties
        ...Pick(browser.extension.manifest, [
            'applications',

            'description',
            'icons',

            'background',
            'options_ui',
            'web_accessible_resources'
        ])
    };
}

function buildManifest(browser, environment, manifests) {
    let current = CloneDeep(getExtensionManifest(browser));

    // Merge module manifests
    for(let i = 0; i < manifests.length; i++) {
        let manifest = manifests[i];

        current = {
            ...current,
            ...manifest,

            'icons': {
                ...current.icons,
                ...manifest.icons
            },

            'content_scripts': [
                ...current.content_scripts,
                ...manifest.content_scripts
            ],

            'web_accessible_resources': [
                ...current.web_accessible_resources,
                ...manifest.web_accessible_resources
            ],

            'permissions': [
                ...current.permissions,
                ...manifest.permissions
            ],

            'optional_permissions': [
                ...current.optional_permissions,
                ...manifest.optional_permissions
            ]
        };
    }

    // Remove background scripts that don't exist
    if(!IsNil(current['background'].scripts)) {
        Remove(current['background'].scripts, (path) =>
            !Filesystem.existsSync(Path.join(environment.outputPath, path))
        );
    }

    // Sort arrays
    current['permissions'] = Uniq(current.permissions).sort();
    current['optional_permissions'] = Uniq(current.optional_permissions).sort();

    current['web_accessible_resources'] = current.web_accessible_resources.sort();

    return OmitBy(current, IsNil);
}

function getContentScriptPatterns(module) {
    return Reduce(module.manifest.content_scripts, (result, contentScript) => {
        ForEach(contentScript.conditions, (condition) => {
            if(IsNil(condition) || IsNil(condition.pattern)) {
                throw new Error('Invalid content script condition');
            }

            // Include pattern in result
            result.push(condition.pattern);
        });

        return result;
    }, []);
}

function buildModulePermissions(browser, module) {
    let permissions = [
        ...module.manifest.origins,
        ...module.manifest.permissions
    ];

    let optionalPermissions = [
        ...module.manifest.optional_origins,
        ...module.manifest.optional_permissions
    ];

    // Declarative Content
    if(browser.supports.api['declarativeContent'] && browser.supports.api['permissions']) {
        optionalPermissions = optionalPermissions.concat(getContentScriptPatterns(module));
    }

    // Destination / Source
    if(['destination', 'source'].indexOf(module.type) >= 0) {
        if(browser.supports.api['permissions']) {
            // Request permissions when the module is enabled
            return {
                'permissions': [],
                'optional_permissions': optionalPermissions.concat(permissions)
            };
        }

        // Request permissions on extension installation
        return {
            'permissions': permissions.concat(optionalPermissions),
            'optional_permissions': []
        };
    }

    // Unknown Module
    return {
        'permissions': permissions,
        'optional_permissions': optionalPermissions
    };
}

function createContentScript(browser, environment, contentScript) {
    if(IsNil(contentScript) || IsNil(contentScript.conditions)) {
        throw new Error('Invalid content script definition');
    }

    return {
        css: Filter(contentScript.css || [], (path) =>
            Filesystem.existsSync(Path.join(environment.outputPath, path))
        ),

        js: Filter(contentScript.js || [], (path) =>
            Filesystem.existsSync(Path.join(environment.outputPath, path))
        ),

        matches: contentScript.conditions.map((condition) => {
            if(IsNil(condition) || IsNil(condition.pattern)) {
                throw new Error('Invalid content script condition');
            }

            return condition.pattern;
        })
    };
}

function buildModuleManifest(browser, environment, module) {
    let manifest = {
        'icons': {},

        'content_scripts': [],
        'web_accessible_resources': [],

        // Retrieve module manifest properties
        ...Pick(module.manifest, [
            'icons',
            'web_accessible_resources'
        ]),

        // Build module permissions
        ...buildModulePermissions(browser, module)
    };

    // Content Scripts (if the browser doesn't support declarative content)
    if(!browser.supports.api['declarativeContent'] || !browser.supports.api['permissions']) {
        manifest['content_scripts'] = module.manifest['content_scripts'].map((contentScript) =>
            createContentScript(browser, environment, contentScript)
        );
    }

    return manifest;
}

function buildModuleManifests(browser, environment) {
    return Promise.all(Map(Filter(browser.modules, (module) => module.type !== 'package'), (module) =>
        buildModuleManifest(browser, environment, module)
    ));
}

export const Manifest = Task.create({
    name: 'build:manifest',
    description: 'Build extension manifest.',

    required: [
        Clean,
        Extension
    ]
}, function(log, browser, environment) {
    // Build manifest from modules
    return buildModuleManifests(browser, environment)
        .then((manifests) => buildManifest(browser, environment, manifests))
        .then((manifest) => Filesystem.writeJson(Path.join(environment.outputPath, 'manifest.json'), manifest, {
            spaces: 2
        }));
});

export default Manifest;
