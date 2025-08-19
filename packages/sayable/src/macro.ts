import type { Sayable } from './class';
import type { Disallow, PluralOptions, SelectOptions } from './types.js';

declare interface MacroSayable extends Sayable {
  (strings: TemplateStringsArray, ...placeholders: unknown[]): string;
  (descriptor: { context?: string }): MacroSayable;
}

declare class MacroSayable extends Sayable {
  plural(
    value: number,
    options: PluralOptions & Disallow<'id' | 'value'>,
  ): string;
  ordinal(
    value: number,
    options: PluralOptions & Disallow<'id' | 'value'>,
  ): string;
  select(
    value: string,
    options: SelectOptions & Disallow<'id' | 'value'>,
  ): string;
}

throw new Error(
  'You are importing "sayable/macro" directly. ' +
    'This module is not meant to be used at runtime. ' +
    'Instead, use a compiler and the sayable plugin to compile macros into executable code.',
);

export default MacroSayable;

export * from './runtime.js';
