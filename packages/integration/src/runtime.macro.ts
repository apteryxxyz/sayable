import type * as runtime from './runtime.js';
import type { NumeralOptions, SelectOptions } from './types.js';

export declare namespace Sayable {
  export type Messages = runtime.Sayable.Messages;
  export type Loader = runtime.Sayable.Loader;
}

export declare interface Sayable extends runtime.Sayable {
  /**
   * Define a message.
   *
   * @example
   * ```ts
   * say`Hello, ${name}!`
   * ```
   */
  (strings: TemplateStringsArray, ...placeholders: unknown[]): string;

  /**
   * Provide a context for the message, used to disambiguate identical strings
   * that have different meanings depending on usage.
   *
   * @example
   * ```ts
   * say({ context: 'direction' })`Right`
   * say({ context: 'correctness' })`Right`
   * ```
   *
   * @param descriptor Object containing an optional `context` property.
   */
  (descriptor: { context?: string }): Sayable;
}

export declare class Sayable extends runtime.Sayable {
  /**
   * Define a pluralised message.
   *
   * @example
   * ```ts
   * say.plural(count, {
   *   one: 'You have 1 item',
   *   other: 'You have # items',
   * })
   * ```
   *
   * The `#` symbol inside options is replaced with the numeric value.
   * @param _ Number to determine the plural form of
   * @param options Pluralisation rules keyed by CLDR categories or specific numbers
   * @returns The plural form of the number
   */
  plural(_: number, options: NumeralOptions): string;

  /**
   * Define an ordinal message (e.g. "1st", "2nd", "3rd").
   * The `#` symbol inside options is replaced with the numeric value.
   *
   * @example
   * ```ts
   * say.ordinal(position, {
   *   1: '#st',
   *   2: '#nd',
   *   3: '#rd',
   *   other: '#th',
   * })
   * ```
   *
   * @param _ Number to determine the ordinal form of
   * @param options Ordinal rules keyed by CLDR categories or specific numbers
   * @returns The ordinal form of the number
   */
  ordinal(_: number, options: NumeralOptions): string;

  /**
   * Define a select message, useful for handling gender, status, or other categories.
   *
   * @param _ Selector value to determine which option is chosen
   * @param options A mapping of possible selector values to message strings
   * @returns The select form of the value
   *
   * @example
   * ```ts
   * say.select(gender, {
   *   male: 'He',
   *   female: 'She',
   *   other: 'They',
   * })
   * ```
   */
  select(_: string, options: SelectOptions): string;
}

throw new Error(
  'You are importing "sayable" directly. ' +
    'This module is not meant to be used at runtime. ' +
    'Instead, use a compiler and the sayable plugin to compile macros into executable code.',
);

export * from './types.js';
