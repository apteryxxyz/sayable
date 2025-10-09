import type { input } from 'zod';
import type * as s from './shapes.js';

export type Config = input<typeof s.Configuration>;
export type Catalogue = input<typeof s.Catalogue>;
export type Formatter = input<typeof s.Formatter>;
export namespace Formatter {
  export type Message = s.Formatter.Message;
}

export * from './define.js';
