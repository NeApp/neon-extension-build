import Assign from 'lodash/assign';
import Crypto from 'crypto';
import Filesystem from 'fs-extra';
import Glob from 'glob';
import Map from 'lodash/map';
import Path from 'path';


export function calculate(path) {
    return Filesystem.readFile(path).then((data) => {
        return Crypto.createHash('md5')
            .update(data, 'binary')
            .digest('hex');
    });
}

export function calculateMany(base, source) {
    return new Promise((resolve, reject) => {
        Glob(Path.join(base, source), (err, files) => {
            if(err) {
                reject(err);
                return;
            }

            // Calculate hashes for each file
            resolve(Promise.all(Map(files, (path) => {
                let stats = Filesystem.statSync(path);

                // Ignore directories
                if(stats.isDirectory()) {
                    return {};
                }

                // Calculate file checksum
                let name = Path.relative(base, path);
                let result = {};

                return calculate(path).then((hash) => {
                    result[name] = hash;
                    return result;
                });
            })).then((hashes) => {
                return Assign({}, ...hashes);
            }));
        });
    });
}

function encodeHashes(hashes) {
    let lines = Map(Object.keys(hashes).sort(), (key) => {
        return `${hashes[key]}  ${key}\n`;
    });

    return lines.join('');
}

export function writeMany(base, source, destination = 'MD5SUMS') {
    return calculateMany(base, source).then((hashes) =>
        Filesystem.writeFile(Path.join(base, destination), encodeHashes(hashes))
    );
}

export default {
    calculate,
    writeMany
};
