import Chalk from 'chalk';
import Filesystem from 'fs';
import Glob from 'glob';
import Map from 'lodash/map';
import Mkdirp from 'mkdirp';
import PadEnd from 'lodash/padEnd';
import Path from 'path';

import Clean from '../clean';
import {Task} from '../../core/helpers';


const Pattern = '**/*.{css,eot,html,js,png,svg,ttf,woff}';

export const Assets = Task.create({
    name: 'build:assets',
    description: 'Build extension assets.',

    required: [
        Clean
    ]
}, function(log, browser, environment) {
    const outputPath = Path.join(environment.options['build-dir'], browser.name, environment.name, 'unpacked');

    // Ensure output directory exists
    Mkdirp.sync(outputPath);

    // Copy assets to build directory
    return Promise.all(Map(browser.modules, (module) => {
        let destinationPath = outputPath;
        let sourcePath = Path.join(module.path, 'assets');

        // Ensure source path exists
        if(!Filesystem.existsSync(sourcePath)) {
            return Promise.resolve();
        }

        // Add module name suffix to output directory
        if(['destination', 'source'].indexOf(module.type) >= 0) {
            destinationPath = Path.join(
                destinationPath,
                module.name.replace('neon-extension-', '').replace('-', Path.sep)
            );
        }

        // Copy module assets to build directory
        return copy(sourcePath, destinationPath).then((files) => {
            log.info(Chalk.green(
                '[' + PadEnd(module.name, 35) + '] Copied ' + files.length + ' asset(s)'
            ));
        }, (err) => {
            log.info(Chalk.red(
                '[' + PadEnd(module.name, 35) + '] Unable to copy assets: ' + err.message
            ));
            return Promise.reject(err);
        });
    }));
});

function copy(basePath, outputPath) {
    return new Promise((resolve) => {
        Glob(basePath + '/' + Pattern, (err, files) => {
            // Copy matched files to output directory
            let promises = files.map((filePath) =>
                copyFile(filePath,  Path.join(outputPath, Path.relative(basePath, filePath)))
            );

            // Wait until all files have been copied
            resolve(Promise.all(promises));
        });
    });
}

function copyFile(sourcePath, outputPath) {
    return new Promise((resolve, reject) => {
        // Ensure output directory exists
        Mkdirp.sync(Path.dirname(outputPath));

        // Copy file to output path
        Filesystem.createReadStream(sourcePath).pipe(
            Filesystem.createWriteStream(outputPath)
                .on('error', (err) => reject(err))
                .on('finish', () => resolve(outputPath))
        );
    });
}

export default Assets;
