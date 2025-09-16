import type { input } from 'zod';
import type * as s from './shapes.js';

export type Config = input<typeof s.Configuration>;
export type Catalogue = input<typeof s.Catalogue>;
export type Transformer = input<typeof s.Transformer>;
export type Extractor = input<typeof s.Extractor>;
export type Formatter = input<typeof s.Formatter>;
export type FormatterMessage = s.Formatter.Message;

export function defineConfig<T extends Config>(config: T): T {
  return config;
}
