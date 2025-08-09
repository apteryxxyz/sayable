import type { input } from 'zod';
import type * as s from './shapes.js';

export type Config = input<typeof s.Configuration>;

export function defineConfig(config: Config) {
  return config;
}
