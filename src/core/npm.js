import Chalk from 'chalk';
import Filter from 'lodash/filter';
import ForEach from 'lodash/forEach';
import IsNil from 'lodash/isNil';
import IsPlainObject from 'lodash/isPlainObject';
import IsString from 'lodash/isString';
import Map from 'lodash/map';
import {exec} from 'child_process';


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

function run(cmd, options) {
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

export function link(pkgs, options) {
    if(IsNil(pkgs)) {
        return Promise.reject(new Error('Invalid value provided for the "name" parameter (expected array or string)'));
    }

    if(IsString(pkgs)) {
        pkgs = [pkgs];
    }

    if(!Array.isArray(pkgs)) {
        return Promise.reject(new Error('Invalid value provided for the "name" parameter (expected array or string)'));
    }

    if(pkgs.length < 1) {
        return Promise.resolve();
    }

    return run(`link ${pkgs.join(' ')}`, options);
}

export function linkToGlobal(options) {
    return run('link', options);
}

export function list(path, options) {
    let cmd = 'ls';

    if(!IsNil(options)) {
        cmd += ` ${encodeOptions(options)}`;
    }

    return run(cmd, {
        cwd: path,
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
    link,
    linkToGlobal,
    list,
    pack
};
