#!/usr/bin/env node

import { program } from 'commander';
import compile from './compile.js';
import extract from './extract.js';

program.name('sayable').addCommand(compile).addCommand(extract).parse();
