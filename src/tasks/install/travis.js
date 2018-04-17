import Path from 'path';
import Process from 'process';

import Npm from '../../core/npm';
import Vorpal from '../../core/vorpal';
import {getPackageModules} from '../../core/package';
import {runSequential} from '../../core/helpers/promise';


let cmd = Vorpal.command('install:travis <branch>', 'Install travis environment.')
    .option('--target <target>', 'Target package [default: ./]');

// Action
cmd.action(({branch, options}) => {
    let target = Path.resolve(options.target || Process.cwd());
    let path = Path.resolve(target, 'package.json');

    // Find package modules
    return getPackageModules(path).then((modules) => {
        Vorpal.logger.info(`Installing ${modules.length} module(s) to "${target}"...`);

        // Install modules sequentially
        return runSequential(modules, (name) =>
            Npm.installModule(name, branch, {
                cwd: target
            })
        );
    }).catch((err) => {
        Vorpal.logger.error(err.stack || err.message || err);
        Process.exit(1);
    });
});
