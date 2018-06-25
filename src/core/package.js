import CloneDeep from 'lodash/cloneDeep';
import Filesystem from 'fs-extra';
import IsEqual from 'lodash/isEqual';
import IsNil from 'lodash/isNil';
import IsPlainObject from 'lodash/isPlainObject';
import MapValues from 'lodash/mapValues';
import Merge from 'lodash/merge';
import Path from 'path';
import PickBy from 'lodash/pickBy';
import Without from 'lodash/without';
import ForEach from 'lodash/forEach';
import Filter from 'lodash/filter';
import Values from 'lodash/values';


export class Dependency {
    constructor(values) {
        // Parse values
        let {name, version, requires, parent, extras} = {
            name: null,
            version: null,
            requires: {},
            parent: null,
            extras: {},

            ...(values || {})
        };

        // Validate values
        if(IsNil(name)) {
            throw new Error('Missing required "name" value');
        }

        if(IsNil(version)) {
            throw new Error('Missing required "version" value');
        }

        // Set values
        this.name = name;
        this.version = version;
        this.requires = requires;
        this.parent = parent;
        this.extras = extras;

        this.dependencies = {};
    }

    get integrity() {
        return this.extras.integrity || null;
    }

    get(name) {
        return this.dependencies[name] || null;
    }

    resolve(name) {
        let dependency = this.get(name);

        if(!IsNil(dependency)) {
            return dependency;
        }

        // Try resolve in parent
        if(IsNil(this.parent)) {
            return null;
        }

        return this.parent.resolve(name);
    }
}

export function createDependencyTree(dependency, options = null) {
    options = {
        name: null,
        parent: null,

        ...(options || {})
    };

    // Parse dependency
    let {name, version, requires, dependencies, ...extras} = {
        name: options.name,
        version: null,
        requires: {},
        dependencies: {},

        ...dependency
    };

    // Create dependency node
    let node = new Dependency({
        name,
        version,
        requires,
        extras,

        parent: options.parent
    });

    // Parse dependencies
    node.dependencies = MapValues(dependencies, (dep, name) =>
        createDependencyTree(dep, {
            parent: node,
            name
        })
    );

    return node;
}

export function getDependencyTree(path) {
    return Filesystem.readJson(Path.join(path, 'package-lock.json')).then((dependency) =>
        createDependencyTree(dependency)
    );
}

export function orderModules(modules) {
    let result = [];

    ForEach([
        'neon-extension-build',
        'neon-extension-framework',
        'neon-extension-core'
    ], (name) => {
        if(modules.indexOf(name) < 0) {
            return;
        }

        result.push(name);
    });

    // Append remaining modules
    return result.concat(Without(modules, ...result));
}

export function getBrowserModules(browser) {
    return [
        browser.modules['neon-extension-build'],
        browser.modules['neon-extension-framework'],
        browser.modules['neon-extension-core'],

        ...Filter(Values(browser.modules), (module) => [
            'neon-extension-build',
            'neon-extension-framework',
            'neon-extension-core'
        ].indexOf(module.name) < 0)
    ];
}

export function getPackageModules(pkg) {
    if(pkg.name.indexOf('neon-extension-') !== 0) {
        return Promise.reject(new Error(`Invalid module: ${pkg.name}`));
    }

    return orderModules(Filter([
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.peerDependencies || {})
    ], (name) =>
        name.indexOf('neon-extension-') === 0
    ));
}

export function readPackageModules(path) {
    return Filesystem.readJson(path).then((pkg) =>
        getPackageModules(pkg)
    );
}

function parsePackageDetails(data) {
    return Merge({
        name: null,
        version: null,
        description: null,
        keywords: null,

        homepage: null,
        author: null,
        license: null,

        main: null,
        private: null,

        bugs: null,
        engines: null,
        repository: null,

        dependencies: {},
        devDependencies: {},
        peerDependencies: {},

        bin: null,
        scripts: null
    }, data);
}

export function readPackageDetails(path) {
    // Read package details from file
    return Filesystem.readJson(Path.join(path, 'package.json')).then((data) => {
        if(!IsPlainObject(data)) {
            return Promise.reject(new Error(
                'Expected manifest to be a plain object'
            ));
        }

        // Parse package details
        return parsePackageDetails(data);
    });
}

export function parsePackageDependency(dep) {
    if(!IsPlainObject(dep)) {
        dep = { version: dep };
    }

    return {
        from: null,
        version: null,

        ...(dep || {})
    };
}

export function updatePackage(pkg, versions = null, options = null) {
    versions = versions || {};

    options = {
        formatVersion: (version) => version,

        ...(options || {})
    };

    function updateVersions(pkg, group) {
        let dependencies = pkg[group];

        if(IsNil(dependencies)) {
            return dependencies;
        }

        return {
            ...dependencies,

            // Update package versions
            ...MapValues(PickBy(versions, (_, name) =>
                !IsNil(dependencies[name])
            ), (dep, name) => {
                let { version } = parsePackageDependency(dep);

                if(IsNil(version)) {
                    throw new Error(`Invalid version defined for "${name}": ${version}`);
                }

                return options.formatVersion(version, name, group);
            })
        };
    }

    if(!IsNil(pkg.dependencies) && Object.keys(pkg.dependencies).length > 0) {
        pkg.dependencies = updateVersions(pkg, 'dependencies');
    }

    if(!IsNil(pkg.peerDependencies) && Object.keys(pkg.peerDependencies).length > 0) {
        pkg.peerDependencies = updateVersions(pkg, 'peerDependencies');
    }

    return pkg;
}

export function writePackage(path, versions = null, options = null) {
    if(Filesystem.statSync(path).isDirectory()) {
        path = Path.join(path, 'package.json');
    }

    // Read package details
    return Filesystem.readFile(path).then((data) => {
        let previous = JSON.parse(data);

        // Update package versions
        let current = updatePackage(CloneDeep(previous), versions, options);

        if(IsEqual(previous, current)) {
            return Promise.resolve(false);
        }

        // Write package details
        return Filesystem.writeJson(path, current, {
            EOL: data.indexOf('\r\n') >= 0 ? '\r\n' : '\n',
            spaces: 2
        }).then(() =>
            true
        );
    });
}

export function updatePackageLocks(locks, versions = null, options = null) {
    versions = versions || {};

    options = {
        formatVersion: (version) => version,

        ...(options || {})
    };

    // Update package locks
    return {
        ...locks,

        // Update package version
        version: versions[locks.name] || locks.version,

        // Update dependencies
        dependencies: {
            ...locks.dependencies,

            // Update modules
            ...MapValues(PickBy(locks.dependencies, (_, name) =>
                name.indexOf('neon-extension-') === 0
            ), (dependency, name) => {
                // Update version (if provided)
                if(!IsNil(versions[name])) {
                    let { from, version } = parsePackageDependency(versions[name]);

                    // Update package "version"
                    if(IsNil(version)) {
                        throw new Error(`Invalid version defined for "${name}": ${version}`);
                    }

                    dependency.version = options.formatVersion(version, name);

                    // Update package "from"
                    if(!IsNil(from)) {
                        dependency.from = from;
                    } else if(!IsNil(dependency.from)) {
                        delete dependency.from;
                    }
                }

                // Ensure "integrity" field hasn't been defined
                if(!IsNil(dependency.integrity)) {
                    delete dependency.integrity;
                }

                return dependency;
            })
        }
    };
}

export function writePackageLocks(path, versions = null, options = null) {
    if(Filesystem.statSync(path).isDirectory()) {
        path = Path.join(path, 'package-lock.json');
    }

    // Ensure package locks exist
    if(!Filesystem.existsSync(path)) {
        return Promise.resolve(false);
    }

    // Read package locks
    return Filesystem.readFile(path).then((data) => {
        let previous = JSON.parse(data);

        // Update package locks
        let current = updatePackageLocks(CloneDeep(previous), versions, options);

        if(IsEqual(previous, current)) {
            return Promise.resolve(false);
        }

        // Write package locks
        return Filesystem.writeJson(path, current, {
            EOL: data.indexOf('\r\n') >= 0 ? '\r\n' : '\n',
            spaces: 2
        }).then(() =>
            true
        );
    });
}

export default {
    getBrowserModules,
    getPackageModules,
    orderModules,

    readPackageDetails,
    readPackageModules,

    updatePackage,
    updatePackageLocks,

    writePackage,
    writePackageLocks
};
