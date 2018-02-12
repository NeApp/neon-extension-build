import Filesystem from 'fs';

import Authors from './authors';
import Libraries from './libraries';
import {Task} from '../../../core/helpers';


export const Credits = Task.create({
    name: 'build:credits',
    description: 'Build extension credits.',

    required: [
        Authors,
        Libraries
    ]
});

// Import children
Filesystem.readdirSync(__dirname).forEach(function(name) {
    try {
        require('./' + name);
    } catch(e) {
        console.warn('Unable to import "./' + name + '": ' + e);
    }
});

export default Credits;
