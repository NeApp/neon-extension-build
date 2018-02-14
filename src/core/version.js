import IsNil from 'lodash/isNil';


function isDirty({extension, modules}) {
    if(extension.repository.dirty) {
        return true;
    }

    for(let name in modules) {
        if(!modules.hasOwnProperty(name)) {
            continue;
        }

        if(modules[name].repository.dirty) {
            return true;
        }
    }

    return false;
}

function generateVersionName({commit, branch, tag, version, repository}, dirty = false) {
    // Append repository identifier
    if(IsNil(tag)) {
        if(branch === 'master') {
            version += '-pre';
        } else {
            version += '-dev';

            // Append branch name (for unknown branches)
            if(branch !== 'develop') {
                version += `-${branch.replace(/[^A-Za-z0-9]+/g, '-')}`;
            }
        }

        // Append short commit sha
        if(!IsNil(commit)) {
            version += `-${commit.substring(0, 7)}`;
        }
    }

    // Append repository "dirty" tag
    if(dirty || repository.dirty) {
        version += '-dirty';
    }

    return version;
}

function generateVersion({travis, version}) {
    version = version.substring(0, version.indexOf('-')) || version;

    // Add travis build number (if defined)
    if(!IsNil(travis.number)) {
        return `${version}.${travis.number}`;
    }

    // Return plain version
    return version;
}

export function resolve(module) {
    if(!IsNil(module.tag) && module.tag.indexOf(`v${module.version}`) !== 0) {
        throw new Error(`Tag "${module.tag}" should match the package version "${module.version}"`);
    }

    return {
        version: generateVersionName(module)
    };
}

export function resolveBrowser(browser) {
    if(!IsNil(module.tag) && module.tag.indexOf(`v${module.version}`) !== 0) {
        throw new Error(`Tag "${module.tag}" should match the package version "${module.version}"`);
    }

    let dirty = isDirty(browser);

    return {
        version: generateVersion(browser.extension),
        versionName: generateVersionName(browser.extension, dirty),

        dirty
    };
}

export default {
    resolve,
    resolveBrowser
};
