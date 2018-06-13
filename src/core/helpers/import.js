import ForEach from 'lodash/forEach';
import Glob from 'glob';
import IsNil from 'lodash/isNil';
import IsPlainObject from 'lodash/isPlainObject';
import IsString from 'lodash/isString';
import Vorpal from '../vorpal';


const Logger = Vorpal.logger;

export function importGlob(path, options) {
    if(IsString(options)) {
        options = { pattern: options };
    } else if(IsNil(options)) {
        options = {
            pattern: '*.js',
            ignore: '{index,*.spec}.js',

            ...options
        };
    }

    // Validate options
    if(!IsPlainObject(options)) {
        throw new Error(
            'Invalid value provided for the "options" parameter ' +
            '(expected pattern string, or options object)'
        );
    }

    if(IsNil(options.pattern)) {
        throw new Error('Missing required option: pattern');
    }

    // Find files matching the glob pattern
    let files;

    try {
        files = Glob.sync(options.pattern, {
            cwd: path,
            ignore: options.ignore,

            absolute: true,
            nodir: true
        });
    } catch(e) {
        Logger.error(`Unable to find modules: ${e.message || e}`);
        return;
    }

    // Import modules
    ForEach(files, (name) => {
        try {
            require(name);
        } catch(e) {
            Logger.warn(`Unable to import "${name}": ${e} ${e && e.stack}`);
        }
    });
}

export default importGlob;
