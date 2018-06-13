import Chalk from 'chalk';
import Filesystem from 'fs-extra';
import ForEach from 'lodash/forEach';
import IsNil from 'lodash/isNil';
import Map from 'lodash/map';
import Mkdirp from 'mkdirp';
import PadEnd from 'lodash/padEnd';
import Path from 'path';
import Reduce from 'lodash/reduce';
import Util from 'util';
import Webpack from 'webpack';

import Validator from '../../webpack/validator';
import {Task} from '../../core/helpers';
import {createConfiguration} from '../../webpack';
import {runSequential} from '../../core/helpers/promise';


function constructCompiler(browser, environment) {
    // Generate configuration
    let configuration;

    try {
        configuration = createConfiguration(browser, environment);
    } catch(e) {
        throw new Error(`Unable to generate configuration: ${e.stack}`);
    }

    // Ensure output directory exists
    Mkdirp.sync(environment.outputPath);

    // Save configuration
    Filesystem.writeFileSync(
        Path.join(environment.buildPath, 'webpack.config.js'),
        Util.inspect(configuration, { depth: null }),
        'utf-8'
    );

    // Construct compiler
    return Webpack(configuration);
}

function registerLinks(browser, environment, rootPath) {
    if(!Filesystem.existsSync(rootPath)) {
        return Promise.resolve();
    }

    return Filesystem.readdir(rootPath).then((names) => runSequential(names, (name) => {
        let path = Path.join(rootPath, name);

        // Search scope directories
        if(name.indexOf('@') === 0) {
            return registerLinks(browser, environment, path);
        }

        // Retrieve statistics for `path`
        return Filesystem.lstat(path).then((stats) => {
            if(!stats.isSymbolicLink()) {
                return Promise.resolve();
            }

            // Read link target
            return Filesystem.realpath(path).then((target) => {
                // Register link
                Validator.registerLink(browser, environment, path, target);
            });
        });
    }));
}

function runCompiler(compiler) {
    return new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
            if(!IsNil(err)) {
                reject(err);
            } else {
                resolve(stats);
            }
        });
    });
}

function writeStats(environment, stats) {
    return Filesystem.writeJson(
        Path.join(environment.buildPath, 'webpack.stats.json'),
        stats.toJson({
            chunkModules: true
        })
    );
}

export const Extension = Task.create({
    name: 'build:extension',
    description: 'Build extension modules.',

    required: [
        'clean',
        'module:validate'
    ]
}, function(log, browser, environment) {
    // Construct compiler
    let compiler;

    try {
        compiler = constructCompiler(browser, environment);
    } catch(e) {
        return Promise.reject(e);
    }

    return Promise.resolve()
        // Register dependency links
        .then(() => Promise.all(Map(browser.modules, (module) =>
            registerLinks(browser, environment, Path.join(module.path, 'node_modules'))
        )))
        // Run compiler
        .then(() => runCompiler(compiler))
        // Display statistics
        .then((stats) => {
            log.info(stats.toString('normal'));

            // Write statistics to file
            writeStats(environment, stats);

            // Exit if there is any errors
            if(stats.hasErrors()) {
                return Promise.reject(new Error('Build failed'));
            }

            return stats;
        })
        // Display extracted modules
        .then(() => {
            let extracted = environment.webpack.extracted;

            if(Object.keys(extracted).length < 1) {
                return Promise.reject(new Error('No modules were extracted'));
            }

            let nameLength = Reduce(Object.keys(extracted), (result, name) => {
                if(name.length > result) {
                    return name.length;
                }

                return result;
            }, 0);

            ForEach(Object.keys(extracted).sort(), (name) => {
                log.debug(Chalk.green(
                    `${PadEnd(name, nameLength)} => ${extracted[name]}`
                ));
            });

            return extracted;
        });
});

export default Extension;
