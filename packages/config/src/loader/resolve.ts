import { extname } from 'node:path';
import { Configuration } from '~/shapes.js';
import { findConfigFile } from './explorer.js';
import loaders from './loaders.js';

export async function resolveConfig(name = 'sayable') {
  const file = await findConfigFile(name, process.cwd());
  if (!file) throw new Error(`Could not find config file for "${name}"`);

  const ext = extname(file.id) as keyof typeof loaders;
  const loader = loaders[ext] ?? loaders[''];

  let config = await loader(file.id, file.content);
  if (!config || typeof config !== 'object')
    throw new Error(`Invalid config file for "${name}"`);
  if ('sayable' in config) config = config.sayable;

  const result = await Configuration.safeParseAsync(config);
  if (result.error)
    throw new Error(`Invalid config file for "${name}"`, {
      cause: result.error,
    });

  return result.data;
}
