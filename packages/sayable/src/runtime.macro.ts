import type CoreSayable from './runtime.js';
import type { NumeralOptions, SelectOptions } from './types.js';

declare interface Sayable<Locales extends string> extends CoreSayable<Locales> {
  (strings: TemplateStringsArray, ...placeholders: unknown[]): string;
  (descriptor: { context?: string }): Sayable<Locales>;
}

declare class Sayable<Locales extends string> extends CoreSayable<Locales> {
  plural(value: number, options: NumeralOptions): string;
  ordinal(value: number, options: NumeralOptions): string;
  select(value: string, options: SelectOptions): string;
}

declare namespace Sayable {
  export type Descriptor = CoreSayable.Descriptor;
  export type Messages = CoreSayable.Messages;
  export type Loaders<Locale extends string = string> =
    CoreSayable.Loaders<Locale>;
}

throw new Error(
  'You are importing "sayable" directly. ' +
    'This module is not meant to be used at runtime. ' +
    'Instead, use a compiler and the sayable plugin to compile macros into executable code.',
);

export default Sayable;
