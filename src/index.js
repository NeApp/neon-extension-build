#!/usr/bin/env node

import Vorpal from './core/vorpal';
import './tasks';


process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled rejection for promise:', p);
    console.log(' - reason:', reason);

    // Exit process
    process.exit(1);
});

Vorpal.show().parse(process.argv);
