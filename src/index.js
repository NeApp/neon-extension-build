#!/usr/bin/env node

import Vorpal from './core/vorpal';
import './tasks';


process.on('unhandledRejection', (reason, p) => {
    Vorpal.logger.error('Unhandled rejection for promise:', p);
    Vorpal.logger.error(' - reason:', reason);

    // Exit process
    process.exit(1);
});

Vorpal.show().parse(process.argv);
