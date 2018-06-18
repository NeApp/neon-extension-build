import Filter from 'lodash/filter';
import IsNil from 'lodash/isNil';
import Map from 'lodash/map';
import Values from 'lodash/values';

import Npm from '../../core/npm';
import Vorpal from '../../core/vorpal';
import {Task} from '../../core/helpers';
import {runSequential} from '../../core/helpers/promise';
import {writePackageLocks} from '../../core/package';


export const InstallModules = Task.create({
    name: 'module:install',
    description: 'Install modules.'
}, (log, browser, environment) => {
    if(environment.name !== 'development') {
        return Promise.reject(new Error('Only development environments are supported'));
    }

    // Install modules
    let count = 0;

    return runSequential(Values(browser.modules), (module) => {
        if(module.type === 'package') {
            return Promise.resolve();
        }

        count++;

        // Pack module
        return Npm.pack(browser.extension.path, module.path).then(({ stdout, stderr }) => {
            let lines = stdout.split('\n');

            let file = lines[lines.length - 1];

            if(file.indexOf('neon-extension-') !== 0) {
                log.error(`[${module.name}] Invalid file: ${file}`);
                return Promise.reject();
            }

            log.info(`[${module.name}] ${file}`);

            if(stderr.length > 0) {
                log.warn(`[${module.name}] ${stderr}`);
            }

            return file;
        });
    }).then((files) => {
        files = Filter(files, (file) => !IsNil(file));

        // Ensure all modules have been packed
        if(files.length < count) {
            log.error(`Unable to pack ${count - files.length} module(s)`);
            return Promise.reject();
        }

        log.info('Installing package...');

        // Install package
        return Npm.install(browser.extension.path).then(
            Npm.createHandler(Vorpal.logger)
        );
    }).then(() => {
        // De-duplicate modules
        return Npm.dedupe(browser.extension.path).then(
            Npm.createHandler(Vorpal.logger)
        );
    }).then(() => {
        log.info('Cleaning package...');

        // Clean "package-lock.json" (remove "integrity" field from modules)
        return writePackageLocks(browser.extension.path);
    });
});

export default InstallModules;
