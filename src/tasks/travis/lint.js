import Chalk from 'chalk';
import Filesystem from 'fs-extra';
import IsNil from 'lodash/isNil';
import PadEnd from 'lodash/padEnd';
import Path from 'path';
import Process from 'process';

import Npm from '../../core/npm';
import Vorpal from '../../core/vorpal';
import {getPackageModules} from '../../core/package';
import {runSequential} from '../../core/helpers/promise';


export function lintModule(target, prefix) {
    if(!Filesystem.existsSync(target)) {
        return Promise.resolve();
    }

    return Filesystem.readJson(Path.join(target, 'package.json')).then(({ name, scripts }) => {
        if(IsNil(name) || name.length < 1) {
            return Promise.reject(new Error(
                'Invalid package details (no "name" field defined)'
            ));
        }

        // Ensure "lint" script exists
        if(IsNil(scripts.lint)) {
            Vorpal.logger.warn(`${prefix} ${Chalk.yellow('No "lint" script exists')}`);
            return Promise.resolve();
        }

        Vorpal.logger.info(`${prefix} ${Chalk.cyan('Linting...')}`);

        // Run tests
        return Npm.spawn(target, ['run', 'lint'], {
            logger: Vorpal.logger,
            prefix
        });
    });
}

export function lint(target) {
    // Read package details
    return Filesystem.readJson(Path.join(target, 'package.json')).then((pkg) => {
        let modules = getPackageModules(pkg);

        Vorpal.logger.debug(
            `Linting ${modules.length} module(s) in "${Path.relative(Process.cwd(), target) || `.${Path.sep}`}"...`
        );

        // Lint modules
        let success = true;

        return runSequential(modules, (name) => {
            let prefix = `[${PadEnd(name, 40)}]`;

            // Build repository name
            let repository = name.replace('@radon-extension/', 'radon-extension-');

            // Lint module
            return lintModule(Path.join(target, '.modules', repository), prefix).catch((err) => {
                Vorpal.logger.error(`${prefix} ${Chalk.red((err && err.stack) ? err.stack : err)}`);

                // Mark as failed
                success = false;
            });
        }).then(() => {
            if(!success) {
                return Promise.reject(new Error(
                    'Lint found'
                ));
            }

            return true;
        });
    });
}

// Command
let cmd = Vorpal.command('travis:lint', 'Lint modules in travis environment.')
    .option('--target <target>', 'Target package [default: ./]');

// Action
cmd.action(({options}) => {
    let target = Path.resolve(options.target || Process.cwd());

    // Run task
    return lint(target).catch((err) => {
        Vorpal.logger.error((err && err.stack) ? err.stack : err);
        Process.exit(1);
    });
});
