#!/usr/bin/env node

import { program } from '@commander-js/extra-typings';
import compile from './compile.js';
import extract from './extract.js';

program
  .name('sayable')
  .helpOption('-h, --help', 'Display help for command')
  .helpCommand('help [command]', 'Display help for command')
  .addCommand(compile)
  .addCommand(extract)
  .parse();
