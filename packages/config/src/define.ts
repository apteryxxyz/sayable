import type { input } from 'zod';
import type * as s from './shapes.js';

export function defineConfig<T extends input<typeof s.Configuration>>(
  config: T,
): T {
  return config;
}
