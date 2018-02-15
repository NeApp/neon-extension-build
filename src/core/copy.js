import Eol from 'eol';
import Filesystem from 'fs-extra';
import Glob from 'glob';
import Mkdirp from 'mkdirp';
import Path from 'path';


const TextExtensions = [
    '.css',
    '.html',
    '.js'
];

export function copyFile(src, dest) {
    return new Promise((resolve, reject) => {
        // Ensure output directory exists
        Mkdirp.sync(Path.dirname(dest));

        // Copy file to output path
        Filesystem.createReadStream(src).pipe(
            Filesystem.createWriteStream(dest)
                .on('error', (err) => reject(err))
                .on('finish', () => resolve(dest))
        );
    });
}

export function copyTextFile(src, dest) {
    // Ensure output directory exists
    Mkdirp.sync(Path.dirname(dest));

    // Read file
    return Filesystem.readFile(src, 'utf-8').then((data) => {
        // Convert `data` line endings to LF, and write to file
        return Filesystem.writeFile(dest, Eol.lf(data));
    });
}

export default function copy(pattern, src, dest) {
    return new Promise((resolve, reject) => {
        Glob(`${src}/${pattern}`, (err, files) => {
            if(err) {
                reject(err);
                return;
            }

            // Copy matched files to output directory
            let promises = files.map((fileSrc) => {
                let file = Filesystem.lstatSync(fileSrc);

                if(file.isDirectory()) {
                    return Promise.resolve();
                }

                let fileDest = Path.join(dest, Path.relative(src, fileSrc));
                let ext = Path.extname(fileSrc);

                if(TextExtensions.indexOf(ext) >= 0) {
                    // Copy text file to build directory
                    return copyTextFile(fileSrc, fileDest);
                }

                // Copy binary file to build directory
                return copyFile(fileSrc, fileDest);
            });

            // Wait until all files have been copied
            resolve(Promise.all(promises));
        });
    });
}
