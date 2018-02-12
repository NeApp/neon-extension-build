import Vorpal from 'vorpal';
import VorpalLog from 'vorpal-log';


const vorpal = Vorpal()
    .use(VorpalLog)
    .delimiter('neon-extension-build$');

export default vorpal;
