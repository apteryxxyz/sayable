import type { Sayable } from './class';
import type { PluralOptions, SelectOptions } from './types.js';

type Disallow<K extends PropertyKey> = Partial<Record<K, never>>;

declare interface MacroSayable extends Sayable {
  (strings: TemplateStringsArray, ...placeholders: unknown[]): string;
  // (descriptor: { id?: string }): MacroSayable;
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

throw new Error('Macro has been imported outside of macro context');
declare const say: MacroSayable;
export default say;
export * from '.';
