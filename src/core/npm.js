import Chalk from 'chalk';
import ForEach from 'lodash/forEach';
import IsNil from 'lodash/isNil';
import IsPlainObject from 'lodash/isPlainObject';
import IsString from 'lodash/isString';
import Map from 'lodash/map';
import {exec} from 'child_process';


function parseLines(lines) {
    if(IsNil(lines) || lines.length < 1) {
        return [];
    }

    return Map(lines.split('\n'), (line) => {
        line = line.trim();

        // Retrieve level
        let level = 'info';

        if(line.indexOf('npm WARN ') === 0) {
            level = 'warn';
            line = line.substring(9);
        } else if(line.indexOf('npm ERR! ') === 0) {
            level = 'error';
            line = line.substring(9);
        }

        // Return parsed line
        return { level, line };
    });
}

function writeLines(log, lines, options = null) {
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
        if(level === 'warn') {
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

export function createHandler(log, prefix = null) {
    return function({ stdout, stderr }) {
        writeLines(log, stderr, { defaultColour: 'cyan', prefix });
        writeLines(log, stdout, { prefix });
    };
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

export function install(name, options) {
    if(IsNil(options) && IsPlainObject(name)) {
        options = name;
        name = null;
    }

    return new Promise((resolve, reject) => {
        let cmd = 'npm install';

        if(!IsNil(name)) {
            cmd = `npm install ${name}`;
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

export function pack(path, options) {
    return new Promise((resolve, reject) => {
        exec(`npm pack ${path}`, options, (err, stdout, stderr) => {
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

    dedupe,
    install,
    link,
    linkToGlobal,
    pack
};
