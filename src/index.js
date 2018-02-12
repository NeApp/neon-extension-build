#!/usr/bin/env babel-node

import Vorpal from './core/vorpal';
import './tasks';


Vorpal.show().parse(process.argv);
