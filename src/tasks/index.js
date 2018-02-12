import Filesystem from 'fs';


Filesystem.readdirSync(__dirname).forEach(function(name) {
    try {
        require('./' + name);
    } catch(e) {
        console.warn('Unable to import "./' + name + '": ' + e);
    }
});
