import IstanbulCombine from 'istanbul-combine';
import Filesystem from 'fs-extra';
import Path from 'path';
import Process from 'process';

import Vorpal from '../../core/vorpal';
import {getPackageModules} from '../../core/package';


export function coverage(target) {
    // Read package details
    return Filesystem.readJson(Path.join(target, 'package.json')).then((pkg) => {
        let modules = getPackageModules(pkg);

        Vorpal.logger.debug(
            `Combining coverage from ${modules.length} module(s) in ` +
            `"${Path.relative(Process.cwd(), target) || `.${Path.sep}`}"...`
        );

        // Combine coverage
        return IstanbulCombine({
            pattern: '.modules/*/Build/Coverage/coverage-*.json',
            base: '.modules/',

            dir: 'Build/Coverage/',
            print: 'summary',

            reporters: {
                html: {},
                lcovonly: {}
            }
        });
    });
}

// Command
let cmd = Vorpal.command('travis:coverage', 'Combine coverage from modules in the travis environment.')
    .option('--target <target>', 'Target package [default: ./]');

// Action
cmd.action(({options}) => {
    let target = Path.resolve(options.target || Process.cwd());

    // Run task
    return coverage(target).catch((err) => {
        Vorpal.logger.error((err && err.stack) ? err.stack : err);
        Process.exit(1);
    });
});
