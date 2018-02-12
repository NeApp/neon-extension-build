import Filesystem from 'fs-extra';


const writeJson = Filesystem.writeJson;

export function readJson(path, defaultValue = null) {
    return Filesystem.readJson(path).catch((err) => {
        if(err && err.code === 'ENOENT') {
            return defaultValue;
        }

        return Promise.reject(err);
    });
}

export default {
    read: readJson,
    readJson,

    write: writeJson,
    writeJson
};
