import Chalk from 'chalk';
import Filesystem from 'fs-extra';
import Map from 'lodash/map';
import Mkdirp from 'mkdirp';
import PadEnd from 'lodash/padEnd';
import Path from 'path';

import Copy from '../../core/copy';
import {Task} from '../../core/helpers';


const Pattern = '**/*.{css,eot,html,js,png,svg,ttf,woff}';

export const Assets = Task.create({
    name: 'build:assets',
    description: 'Build extension assets.',

    required: [
        'clean',
        'module:validate'
    ]
}, function(log, browser, environment) {
    // Ensure output directory exists
    Mkdirp.sync(environment.outputPath);

    // Copy assets to build directory
    return Promise.all(Map(browser.modules, (module) => {
        let src = Path.join(module.path, 'Assets');
        let dest = environment.outputPath;

        // Ensure source path exists
        if(!Filesystem.existsSync(src)) {
            return Promise.resolve();
        }

        // Add module name suffix to output directory
        if(['destination', 'source'].indexOf(module.type) >= 0) {
            dest = Path.join(dest, `Modules/neon-extension-${module.type}-${module.key}`);
        }

        // Copy module assets to build directory
        return Copy(Pattern, src, dest).then((files) => {
            log.info(Chalk.green(
                `[${PadEnd(module.name, 40)}] Copied ${files.length} asset(s)`
            ));
        }, (err) => {
            log.info(Chalk.red(
                `[${PadEnd(module.name, 40)}] Unable to copy assets: ${err.message}`
            ));
            return Promise.reject(err);
        });
    }));
});

export default Assets;
