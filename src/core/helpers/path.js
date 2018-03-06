import Filesystem from 'fs-extra';


export function isDirectory(path) {
    if(!Filesystem.existsSync(path)) {
        return false;
    }

    return Filesystem.lstatSync(path).isDirectory();
}

export function isFile(path) {
    if(!Filesystem.existsSync(path)) {
        return false;
    }

    return Filesystem.lstatSync(path).isFile();
}

export function resolvePath(...paths) {
    if(paths.length === 1 && Array.isArray(paths)) {
        paths = paths[0];
    }

    for(let i = 0; i < paths.length; i++) {
        if(Filesystem.existsSync(paths[i])) {
            return Filesystem.realpathSync(paths[i]);
        }
    }

    return null;
}
