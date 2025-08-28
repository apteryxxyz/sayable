import type CoreSayable from './runtime.js';
import type { NumeralOptions, SelectOptions } from './types.js';

declare interface Sayable<Translations extends CoreSayable.Translations>
  extends CoreSayable<Translations> {
  (strings: TemplateStringsArray, ...placeholders: unknown[]): string;
  (descriptor: { context?: string }): Sayable<Translations>;
}

declare class Sayable<
  Translations extends CoreSayable.Translations,
> extends CoreSayable<Translations> {
  plural(value: number, options: NumeralOptions): string;
  ordinal(value: number, options: NumeralOptions): string;
  select(value: string, options: SelectOptions): string;
}

throw new Error(
  'You are importing "sayable" directly. ' +
    'This module is not meant to be used at runtime. ' +
    'Instead, use a compiler and the sayable plugin to compile macros into executable code.',
);

export default Sayable;
