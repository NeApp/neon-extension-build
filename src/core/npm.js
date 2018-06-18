import Chalk from 'chalk';
import ChildProcess from 'child_process';
import Filter from 'lodash/filter';
import ForEach from 'lodash/forEach';
import IsNil from 'lodash/isNil';
import IsPlainObject from 'lodash/isPlainObject';
import Map from 'lodash/map';
import {exec} from 'child_process';

import {emitLines} from './helpers/stream';


export function parseLines(lines) {
    if(IsNil(lines) || lines.length < 1) {
        return [];
    }

    return Map(lines.split('\n'), (line) => {
        line = line.trim();

        // Retrieve level
        let level = 'info';

        if(line.indexOf('npm notice') === 0) {
            level = 'notice';
            line = line.substring(10);
        } else if(line.indexOf('npm WARN') === 0) {
            level = 'warn';
            line = line.substring(8);
        } else if(line.indexOf('npm ERR!') === 0) {
            level = 'error';
            line = line.substring(8);
        }

        // Clean line
        line = line.trim();

        // Return parsed line
        return { level, line };
    });
}

export function writeLines(log, lines, options = null) {
    options = {
        defaultColour: null,
        prefix: null,

        ...(options || {})
    };

    let prefix = '';

    if(!IsNil(options.prefix) && options.prefix.length > 0) {
        prefix = `${options.prefix} `;
    }

    // Write lines to logger
    ForEach(parseLines(lines), ({ level, line }) => {
        if(line.length < 1) {
            return;
        }

        if(level === 'notice') {
            log.debug(prefix + line);
        } else if(level === 'warn') {
            log.warn(prefix + Chalk.yellow(line));
        } else if(level === 'error') {
            log.error(prefix + Chalk.red(line));
        } else if(!IsNil(options.defaultColour)) {
            log.info(prefix + Chalk[options.defaultColour](line));
        } else {
            log.info(prefix + line);
        }
    });
}

export function run(path, cmd, options) {
    options = {
        cwd: path,

        ...(options || {})
    };

    return new Promise((resolve, reject) => {
        exec(`npm ${cmd}`, options, (err, stdout, stderr) => {
            let result = {
                err: err || null,

                stdout: stdout && stdout.trim(),
                stderr: stderr && stderr.trim()
            };

            if(!IsNil(err)) {
                reject(result);
                return;
            }

            // Resolve promise
            resolve(result);
        });
    });
}

export function spawn(cwd, args, options = null) {
    options = {
        logger: null,
        prefix: null,

        ...(options || {})
    };

    return new Promise((resolve, reject) => {
        let proc = ChildProcess.spawn('npm', args, {
            shell: true,
            cwd
        });

        // Listen for "error" events
        proc.on('error', (err) => {
            reject(new Error(`Unable to start process: ${(err && err.message) ? err.message : err}`));
        });

        // Listen for "close" events
        proc.on('close', (code) => {
            if(code === 0) {
                resolve();
            } else {
                reject(new Error(`Process exited with code: ${code}`));
            }
        });

        // Ensure logger is enabled
        if(IsNil(options.logger)) {
            return;
        }

        // Configure streams to emit "line" events
        emitLines(proc.stdout);
        emitLines(proc.stderr);

        // Write stdout lines to logger
        proc.stdout.on('line', (line) =>
            writeLines(options.logger, line, {
                prefix: options.prefix
            })
        );

        // Write stderr lines to logger
        proc.stderr.on('line', (line) =>
            writeLines(options.logger, line, {
                defaultColour: 'cyan',
                prefix: options.prefix
            })
        );
    });
}

export function createHandler(log, prefix = null) {
    return function({ stdout, stderr }) {
        writeLines(log, stderr, { defaultColour: 'cyan', prefix });
        writeLines(log, stdout, { prefix });
    };
}

export function encodeOptions(options) {
    return Filter(Map(options, (value, name) => {
        if(value === false) {
            return null;
        }

        if(value === true) {
            return name;
        }

        return `${name} ${value}`;
    }), (arg) => {
        return !IsNil(arg);
    }).join(' ');
}

export function dedupe(options) {
    return new Promise((resolve, reject) => {
        exec('npm dedupe', options, (err, stdout, stderr) => {
            if(!IsNil(err)) {
                reject(err);
                return;
            }

            // Resolve promise
            resolve({
                stdout: stdout.trim(),
                stderr: stderr.trim()
            });
        });
    });
}

export function install(cwd, name, options) {
    if(IsNil(options) && IsPlainObject(name)) {
        options = name;
        name = null;
    }

    options = {
        cwd,

        ...(options || {})
    };

    return new Promise((resolve, reject) => {
        let cmd = 'npm install';

        if(!IsNil(name)) {
            cmd = `npm install "${name}"`;
        }

        exec(cmd, options, (err, stdout, stderr) => {
            if(!IsNil(err)) {
                reject(err);
                return;
            }

            // Resolve promise
            resolve({
                stdout: stdout.trim(),
                stderr: stderr.trim()
            });
        });
    });
}

export function list(path, options) {
    let cmd = 'ls';

    if(!IsNil(options)) {
        cmd += ` ${encodeOptions(options)}`;
    }

    return run(path, cmd, {
        maxBuffer: 1024 * 1024 // 1 MB
    });
}

export function pack(cwd, path, options) {
    options = {
        cwd,

        ...(options || {})
    };

    return new Promise((resolve, reject) => {
        exec(`npm pack "${path}"`, options, (err, stdout, stderr) => {
            if(!IsNil(err)) {
                reject(err);
                return;
            }

            // Resolve promise
            resolve({
                stdout: stdout.trim(),
                stderr: stderr.trim()
            });
        });
    });
}

export default {
    createHandler,
    parseLines,
    writeLines,

    dedupe,
    install,
    list,
    pack,
    run,
    spawn
};
