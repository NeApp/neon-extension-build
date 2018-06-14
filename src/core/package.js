import Filesystem from 'fs-extra';
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
        let {name, version, requires, parent} = {
            name: null,
            version: null,
            requires: {},

            parent: null,

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

        this.dependencies = {};
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
    let {name, version, requires, dependencies} = {
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

export function updatePackageVersions(pkg, versions) {
    function updateVersions(dependencies) {
        if(IsNil(dependencies)) {
            return dependencies;
        }

        return {
            ...dependencies,

            ...PickBy(versions, (_, name) =>
                !IsNil(dependencies[name])
            )
        };
    }

    if(!IsNil(pkg.dependencies)) {
        pkg.dependencies = updateVersions(pkg.dependencies);
    }

    if(!IsNil(pkg.peerDependencies)) {
        pkg.peerDependencies = updateVersions(pkg.peerDependencies);
    }

    return pkg;
}

export function writePackageVersions(path, versions) {
    if(Filesystem.statSync(path).isDirectory()) {
        path = Path.join('package.json');
    }

    // Read package details
    return Filesystem.readFile(path).then((data) => {
        let pkg = JSON.parse(data);

        // Write package details
        return Filesystem.writeJson(path, updatePackageVersions(pkg, versions), {
            EOL: data.indexOf('\r\n') >= 0 ? '\r\n' : '\n',
            spaces: 2
        });
    });
}

export function updatePackageLockVersions(locks, versions) {
    return {
        ...locks,

        dependencies: {
            ...locks.dependencies,

            // Update dependencies
            ...MapValues(PickBy(versions, (_, name) =>
                !IsNil(locks.dependencies[name])
            ), (version, name) => ({
                ...locks.dependencies[name],

                version
            }))
        }
    };
}

export function writePackageLockVersions(path, versions) {
    if(Filesystem.statSync(path).isDirectory()) {
        path = Path.join('package-lock.json');
    }

    // Read package locks
    return Filesystem.readFile(path).then((data) => {
        let locks = JSON.parse(data);

        // Write package locks
        return Filesystem.writeJson(path, updatePackageLockVersions(locks, versions), {
            EOL: data.indexOf('\r\n') >= 0 ? '\r\n' : '\n',
            spaces: 2
        });
    });
}

export default {
    getBrowserModules,
    getPackageModules,
    orderModules,

    readPackageDetails,
    readPackageModules,

    updatePackageVersions,
    updatePackageLockVersions,

    writePackageVersions,
    writePackageLockVersions
};
