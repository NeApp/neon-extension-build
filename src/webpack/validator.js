import Filesystem from 'fs-extra';
import Filter from 'lodash/filter';
import Find from 'lodash/find';
import ForEach from 'lodash/forEach';
import Get from 'lodash/get';
import IsNil from 'lodash/isNil';
import Path from 'path';
import SemanticVersion from 'semver';
import Set from 'lodash/set';
import UniqBy from 'lodash/uniqBy';

import ValidatorPlugin from './plugins/validator';
import Vorpal from '../core/vorpal';


const Logger = Vorpal.logger;
const DependencyVersionRegex = /^\d+\.\d+\.\d+(\-\w+(\.\d+)?)?$/g;

const IgnoredPackages = [
    'webpack'
];

export class Validator {
    constructor() {
        this.dependencies = {};
        this.peerDependencies = {};

        this.links = {};

        this._error = false;
    }

    createPlugin(browser, environment) {
        return new ValidatorPlugin(this, browser, environment);
    }

    processModule(browser, environment, module) {
        if(IsNil(browser) || IsNil(environment) || IsNil(module) || IsNil(module.userRequest)) {
            return;
        }

        // Validate each module source
        module.reasons.forEach((source) => {
            let sourcePath = source.module.userRequest;

            if(!IsNil(sourcePath)) {
                // Map linked dependency source
                ForEach(Get(this.links, [browser.name, environment.name]), (source, target) => {
                    let index = sourcePath.indexOf(target);

                    if(index < 0) {
                        return;
                    }

                    // Update `sourcePath`
                    sourcePath = source + sourcePath.substring(index + target.length);
                });
            }

            // Process dependency
            this.processModuleDependency(browser, environment, sourcePath, module.userRequest);
        });
    }

    processModuleDependency(browser, environment, source, request) {
        if(IsNil(browser) || IsNil(environment) || IsNil(request)) {
            return false;
        }

        // Retrieve dependency name
        let dep;

        try {
            dep = this._parseDependency(request);
        } catch(e) {
            console.log(`Unable to parse dependency: "${request}": ${e}`);
            return false;
        }

        // Validate package information
        if(IsNil(dep)) {
            console.log(`Unable to parse dependency: "${request}"`);
            return false;
        }

        // Ignore neon modules
        if(dep.name.startsWith('neon-extension-')) {
            return false;
        }

        // Apply `IgnoredPackages` filter
        if(IgnoredPackages.indexOf(dep.name) >= 0) {
            return false;
        }

        // Search for dependency definition
        let extensionDependency = browser.extension.package.devDependencies[dep.name];

        // Find registered module matching source (if available)
        let module;
        let moduleDependency;

        if(!IsNil(source)) {
            module = Find(browser.modules, (module) => {
                return source.startsWith(module.path);
            });

            if(IsNil(module)) {
                Logger.error(`[${dep.name}] Unknown source: "${source}"`);

                this._error = true;
                return false;
            }
        }

        if(!IsNil(module) && module.type !== 'package') {
            moduleDependency = module.package.dependencies[dep.name];
        }

        // Pick definition
        let dependency = moduleDependency || extensionDependency;

        // Ensure dependency definition was found
        if(IsNil(dependency)) {
            if(!IsNil(module)) {
                Logger.error(`Unable to find "${dep.name}" dependency for "${module.name}"`);
            } else {
                Logger.error(`Unable to find "${dep.name}" dependency`);
            }

            this._error = true;
            return false;
        }

        // Ensure dependency is pinned to a version
        if(!dependency.match(DependencyVersionRegex)) {
            if(!IsNil(moduleDependency)) {
                Logger.error(
                    `Dependency "${dep.name}" for "${module.name}" ` +
                    `should be pinned to a version (found: ${dependency})`
                );
            } else {
                Logger.error(
                    `Dependency "${dep.name}" ` +
                    `should be pinned to a version (found: ${dependency})`
                );
            }

            this._error = true;
            return false;
        }

        // Ensure dependencies aren't duplicated
        if(!IsNil(moduleDependency) && !IsNil(extensionDependency)) {
            Logger.error(
                `Dependency "${dep.name}" has been duplicated ` +
                `(extension: ${extensionDependency}, ${module.name}: ${moduleDependency})`
            );

            this._error = true;
            return false;
        }

        // Mark dependency
        if(!IsNil(moduleDependency)) {
            Set(this.dependencies, [browser.name, environment.name, module.name, dep.name], true);
        } else {
            Set(this.dependencies, [browser.name, environment.name, null, dep.name], true);
        }

        // Validate module dependency
        if(!IsNil(module) && module.type !== 'package') {
            let modulePeerDependency = module.package.peerDependencies[dep.name];

            // Mark peer dependency
            Set(this.peerDependencies, [browser.name, environment.name, module.name, dep.name], true);

            // Ensure peer dependency is defined
            if(!IsNil(extensionDependency) && IsNil(modulePeerDependency)) {
                Logger.error(`"${dep.name}" should be defined as a peer dependency in "${module.name}"`);

                this._error = true;
                return false;
            }

            // Ensure peer dependency is a caret range
            if(!IsNil(extensionDependency) && modulePeerDependency.indexOf('^') !== 0) {
                Logger.error(`"${dep.name}" peer dependency in "${module.name}" should be a caret range`);

                this._error = true;
                return false;
            }

            // Ensure extension dependency matches peer dependency range
            if(!IsNil(extensionDependency) && !SemanticVersion.satisfies(extensionDependency, modulePeerDependency)) {
                Logger.error(
                    `"${dep.name}" peer dependency in "${module.name}" (${modulePeerDependency}) ` +
                    `is not satisfied by extension version: ${extensionDependency}`
                );

                this._error = true;
                return false;
            }
        }

        return true;
    }

    registerLink(browser, environment, source, target) {
        Set(this.links, [browser.name, environment.name, target], source);
    }

    finish(browser, environment) {
        if(this._error) {
            throw new Error('Build didn\'t pass validation');
        }

        if(IsNil(this.dependencies[browser.name]) || IsNil(this.dependencies[browser.name][environment.name])) {
            return;
        }

        if(IsNil(this.peerDependencies[browser.name]) || IsNil(this.peerDependencies[browser.name][environment.name])) {
            return;
        }

        // Ensure there are no unused extension dependencies
        this._checkDependencies('Dependency',
            browser.extension.package.dependencies,
            this.dependencies[browser.name][environment.name][null]
        );

        // Ensure there are no unused module dependencies
        ForEach(Filter(browser.modules, (module) => module.type !== 'package'), (module) => {
            this._checkDependencies('Dependency',
                module.package.dependencies,
                this.dependencies[browser.name][environment.name][module.name],
                module.name
            );

            this._checkDependencies('Peer dependency',
                module.package.peerDependencies,
                this.peerDependencies[browser.name][environment.name][module.name],
                module.name
            );
        });
    }

    _checkDependencies(prefix, current, matched, moduleName) {
        if(IsNil(prefix) || IsNil(current)) {
            return;
        }

        matched = matched || {};

        // Ensure dependencies have been matched
        for(let name in current) {
            if(!current.hasOwnProperty(name) || name.startsWith('neon-extension-')) {
                continue;
            }

            // Check if module was used
            if(matched[name]) {
                continue;
            }

            // Display warning
            if(!IsNil(moduleName)) {
                Logger.warn(`${prefix} "${name}" for "${moduleName}" is not required`);
            } else {
                Logger.warn(`${prefix} "${name}" is not required`);
            }
        }
    }

    _getSources(browser, environment, source) {
        if(IsNil(source.module.userRequest)) {
            return [source];
        }

        // Build list of sources
        let result = [];

        for(let i = 0; i < source.module.reasons.length; i++) {
            result.push.apply(result, source.module.reasons[i]);
        }

        return UniqBy(result, (source) =>
            source.module.userRequest || source.module.name
        );
    }

    _parseDependency(request) {
        let path = Path.dirname(request);
        let packagePath;

        while(true) {
            let current = Path.join(path, 'package.json');

            if(Filesystem.pathExistsSync(current)) {
                packagePath = current;
                break;
            }

            // Go up one directory
            let next = Path.resolve(path, '..');

            if(next === path) {
                return null;
            }

            // Set next search directory
            path = next;
        }

        // Retrieve package name
        let name = Filesystem.readJsonSync(packagePath)['name'];

        // Return package information
        return {
            name,
            path
        };
    }
}

export default new Validator();
