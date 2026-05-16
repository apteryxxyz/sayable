import { extname } from 'node:path';
import type { Config } from '~/shapes.js';
import { findConfigFile } from './files.js';
import { configLoaders } from './module.js';

export function resolveConfig(name = 'saykit') {
  const file = findConfigFile(name, process.cwd());
  if (!file) throw new Error(`Could not find config file for "${name}"`);

  const ext = extname(file.id).toLowerCase();
  const load = ext in configLoaders ? configLoaders[ext as keyof typeof configLoaders] : null;
  if (!load) throw new Error(`Unsupported config file type "${ext}" for "${name}"`);

  const config = load(file.id);
  if (!config || typeof config !== 'object') throw new Error(`Invalid config file for "${name}"`);

  return config as Config;
}
