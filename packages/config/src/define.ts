import type { input } from 'zod';
import type { Configuration } from './shapes.js';

export function defineConfig<Config extends input<typeof Configuration>>(
  config: Config,
): Config {
  return config;
}
