#!/usr/bin/env node

import Vorpal from './core/vorpal';
import './subs';
import './tasks';


Vorpal.show().parse(process.argv);
