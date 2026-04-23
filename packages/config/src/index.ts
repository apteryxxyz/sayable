import type { input } from 'zod';
import { Config } from './shapes.js';

export function defineConfig<C extends input<typeof Config>>(config: C) {
  return Config.parse(config);
}

export type * from './shapes.js';
