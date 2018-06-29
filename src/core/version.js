import IsNil from 'lodash/isNil';


function generateVersionName({commit, branch, tag, version, repository}, dirty = false) {
    // Append repository identifier
    if(IsNil(tag) && !IsNil(branch)) {
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

function isTagValid({ repository, tag, version}) {
    if(IsNil(tag) || repository.dirty) {
        return true;
    }

    return tag.indexOf(`v${version}`) === 0;
}

export function resolve(module) {
    if(!isTagValid(module)) {
        throw new Error(`Tag "${module.tag}" should match the package version "${module.version}"`);
    }

    return {
        version: generateVersionName(module)
    };
}

export function resolveBrowser(browser) {
    if(!isTagValid(browser.extension)) {
        throw new Error(
            `Tag "${browser.extension.tag}" should match the package version "${browser.extension.version}"`
        );
    }

    return {
        version: generateVersion(
            browser.extension
        ),

        versionName: generateVersionName(
            browser.extension,
            browser.extension.dirty
        )
    };
}

export default {
    resolve,
    resolveBrowser
};
