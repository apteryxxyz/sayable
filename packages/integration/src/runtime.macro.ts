import type * as runtime from './runtime.js';
import type { NumeralOptions, SelectOptions } from './types.js';

export declare interface Sayable extends runtime.Sayable {
  (strings: TemplateStringsArray, ...placeholders: unknown[]): string;
  (descriptor: { context?: string }): Sayable;
}

export declare class Sayable extends runtime.Sayable {
  plural(_: number, options: NumeralOptions): string;
  ordinal(_: number, options: NumeralOptions): string;
  select(_: string, options: SelectOptions): string;
}

export declare namespace Sayable {
  export type Messages = runtime.Sayable.Messages;
  export type Loader = runtime.Sayable.Loader;
}

throw new Error(
  'You are importing "sayable" directly. ' +
    'This module is not meant to be used at runtime. ' +
    'Instead, use a compiler and the sayable plugin to compile macros into executable code.',
);

export * from './types.js';
