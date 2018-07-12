import Util from 'util';
import Vorpal from 'vorpal';
import VorpalLog from 'vorpal-log';


const vorpal = Vorpal()
    .use(VorpalLog)
    .delimiter('@radon-extension/build$');

function log(msg) {
    if(typeof msg === 'string') {
        if(vorpal.logger.options.preformat != null) {
            msg = vorpal.logger.options.preformat(msg);
        }
    } else {
        msg = Util.inspect(msg);
    }

    return `${vorpal.logger.printDate()}${msg}`;
}

// Setup logger formats
vorpal.logger.addFormatter('debug', 10, log);
vorpal.logger.addFormatter('info', 20, log);
vorpal.logger.addFormatter('warn', 30, log);
vorpal.logger.addFormatter('error', 40, log);
vorpal.logger.addFormatter('fatal', 50, log);

export default vorpal;
