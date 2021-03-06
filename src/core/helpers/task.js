import Chalk from 'chalk';
import ForEach from 'lodash/forEach';
import IsNil from 'lodash/isNil';
import IsString from 'lodash/isString';
import PadEnd from 'lodash/padEnd';
import Path from 'path';
import Process from 'process';
import Time from 'time-diff';

import Browser from '../browser';
import Environment from '../environment';
import Vorpal from '../vorpal';
import {Browsers, Environments} from '../constants';
import {runSequential} from '../../core/helpers/promise';


const Logger = Vorpal.logger;

const Tasks = {};
const Timer = new Time();

function getBrowserColour({dirty, extension}) {
    if(dirty) {
        return Chalk.red;
    }

    if(extension.repository.ahead > 0) {
        return Chalk.yellow;
    }

    return Chalk.green;
}

function getModuleColour({repository}) {
    if(repository.dirty) {
        return Chalk.red;
    }

    if(repository.ahead > 0) {
        return Chalk.yellow;
    }

    return Chalk.green;
}

function createLogger(prefix, name) {
    function log(target, message) {
        target(`${prefix}(${Chalk.cyan(PadEnd(name, 14))}) ${message}`);
    }

    return {
        debug: log.bind(null, Logger.debug),
        info: log.bind(null, Logger.info),
        warn: log.bind(null, Logger.warn),
        error: log.bind(null, Logger.error),
        fatal: log.bind(null, Logger.fatal)
    };
}

function getEnvironmentName(environment) {
    if(environment.name === 'production') {
        return Chalk.green(environment.title);
    }

    return Chalk.yellow(environment.title);
}

function createLoggerPrefix(browser, environment) {
    return `[${getEnvironmentName(environment)}#${Chalk.cyan(PadEnd(browser.title, 7))}] `;
}

export function createTask({name, required = [], optional = []}, handler = null) {
    return function(browser, environment, options) {
        options = {
            required: true,

            ...options
        };

        let prefix = createLoggerPrefix(browser, environment);

        return Promise.resolve()
            // Resolve required dependencies
            .then(() => Promise.all(required.map((name) => {
                if(!IsString(name)) {
                    return Promise.reject(`Invalid dependency: ${name} (expected string)`);
                }

                if(IsNil(Tasks[name])) {
                    return Promise.reject(`Unknown dependency: ${name}`);
                }

                return Tasks[name](browser, environment).catch(() =>
                    Promise.reject(new Error('Unable to build required dependency'))
                );
            })))
            // Resolve optional dependencies
            .then(() => Promise.all(optional.map((name) => {
                if(!IsString(name)) {
                    return Promise.reject(`Invalid dependency: ${name} (expected string)`);
                }

                if(IsNil(Tasks[name])) {
                    return Promise.reject(`Unknown dependency: ${name}`);
                }

                return Tasks[name](browser, environment, {
                    required: false
                }).catch(() =>
                    false
                );
            })))
            // Start task
            .then(() => {
                let promise = environment.tasks[name];

                // Nil handler
                if(IsNil(handler)) {
                    return Promise.resolve();
                }

                // Ensure task has been started
                if(IsNil(promise)) {
                    Logger.info(`${prefix}Starting '${Chalk.cyan(name)}'...`);

                    // Start timer
                    Timer.start(name);

                    // Create task promise
                    promise = environment.tasks[name] = Promise.resolve().then(() => handler(
                        createLogger(prefix, name),
                        browser,
                        environment,
                        options
                    ));

                    // Display task result
                    promise = promise.then(() => {
                        Logger.info(
                            `${prefix}Finished '${Chalk.cyan(name)}' after ${Chalk.magenta(Timer.end(name))}`
                        );
                    }, (err) => {
                        if(options.required) {
                            Logger.error(
                                `${prefix}Errored '${Chalk.cyan(name)}' after ${Chalk.magenta(Timer.end(name))}: ${
                                    (err && err.stack) ? err.stack : err
                                }`
                            );
                        } else {
                            Logger.info(
                                `${prefix}Skipped '${Chalk.cyan(name)}' after ${Chalk.magenta(Timer.end(name))}: ${
                                    (err && err.stack) ? err.stack : err
                                }`
                            );
                        }

                        return Promise.reject(err);
                    });
                }

                // Return promise
                return promise;
            }, (err) => {
                Logger.error(
                    `${prefix}Errored '${Chalk.cyan(name)}': ${
                        (err && err.stack) ? err.stack : err
                    }`
                );

                return Promise.reject(err);
            });
    };
}

export function createRunner(task, defaultOptions) {
    return function({options, ...args}) {
        // Set default options
        options = {
            'browser': 'all',
            'environment': 'development',
            'debug': false,

            ...(defaultOptions || {}),

            // Override with provided arguments/options
            ...args,
            ...options,

            // Resolve directories
            'build-dir': Path.resolve(process.cwd(), options['build-dir'] || './Build'),
            'package-dir': Path.resolve(process.cwd(), options['package-dir'] || './')
        };

        // Configure logger
        if(options['debug']) {
            Vorpal.logger.setFilter('debug');
        }

        // Run task for each browser
        return runSequential(Browser.getBrowsers(options.browser), (name) =>
            // Resolve browser
            Browser.resolve(options['package-dir'], name).catch((err) => {
                Logger.error(`Unable to resolve browser(s): ${(err && err.stack) ? err.stack : err}`);
                return Promise.reject(err);
            }).then((browser) => {
                // Try create new build environment
                let environment;

                try {
                    environment = Environment.resolve(options.environment, browser, options);
                } catch(err) {
                    Logger.error(
                        `Unable to resolve "${options.environment}" environment: ${
                            (err && err.stack) ? err.stack : err
                        }`
                    );
                    return Promise.resolve();
                }

                // Create logger prefix
                let prefix = createLoggerPrefix(browser, environment);

                // Display loaded modules
                ForEach(browser.modules, (module) => {
                    Logger.info(prefix + getModuleColour(module)(
                        `Loaded: ${module.name} (${module.version})`
                    ));
                });

                // Display extension version
                Logger.info(prefix + getBrowserColour(browser)(
                    `Version: ${browser.version}`
                ));

                // Display extension version name
                Logger.info(prefix + getBrowserColour(browser)(
                    `Version Name: ${browser.versionName}`
                ));

                // Don't build dirty production environments
                if(environment.name === 'production' && browser.extension.dirty) {
                    return Promise.reject(new Error('Environment is dirty'));
                }

                // Run task
                return task(browser, environment, options);
            })
        ).catch((err) => {
            Logger.error(`Build failed: ${(err && err.stack) ? err.stack : err}`);
            Process.exit(1);
        });
    };
}

export function create({name, description, required, optional, command}, handler = null, defaultOptions = {}) {
    let key = name.substring(0, name.indexOf(' ')) || name;

    // Create task
    let task = createTask({
        name: key,

        required,
        optional
    }, handler);

    // Set defaults
    if(IsNil(command)) {
        command = (cmd) => cmd;
    }

    // Create command
    command(Vorpal.command(name, description))
        .option('--build-dir <build-dir>', 'Build Directory [default: ./Build]')
        .option('--package-dir <package-dir>', 'Package Directory [default: ./]')
        .option('--browser <browser>', 'Browser [default: all]', Object.keys(Browsers))
        .option('--environment <environment>', 'Environment [default: development]', Object.keys(Environments))
        .option('--debug', 'Enable debug messages')
        .action(createRunner(task, defaultOptions));

    // Store task reference
    Tasks[key] = task;

    return task;
}
