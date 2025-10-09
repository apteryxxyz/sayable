import type { PropsWithChildren, ReactNode } from 'react';
import type { NumeralOptions, SelectOptions } from 'sayable';
import type { PropsWithJSXSafeKeys } from '~/types.js';

export { SayProvider, useSay } from './runtime.js';

/**
 * Define a message.
 *
 * @example
 * ```tsx
 * <Say>Hello, {name}!</Say>
 * <Say context="direction">Right</Say>
 * <Say context="correctness">Right</Say>
 * ```
 */
export declare function Say(
  props: PropsWithChildren<{ context?: string }>,
): ReactNode;

export declare namespace Say {
  /**
   * Define a pluralised message.
   *
   * @example
   * ```tsx
   * <Say.Plural
   *   _={count}
   *   one="You have 1 item"
   *   other="You have # items"
   * />
   * ```
   *
   * @param props._ Number to determine the plural form of
   * @param props Options pluralisation rules keyed by CLDR categories or specific numbers
   * @returns The plural form of the number, as a React node
   */
  export function Plural(
    props: { _: number } & PropsWithJSXSafeKeys<NumeralOptions>,
  ): ReactNode;

  /**
   * Define an ordinal message (e.g. "1st", "2nd", "3rd").
   *
   * @example
   * ```tsx
   * <Say.Ordinal
   *   _={position}
   *   1="#st"
   *   2="#nd"
   *   3="#rd"
   *   other="#th"
   * />
   * ```
   *
   * @param props._ Number to determine the ordinal form of
   * @param props Options ordinal rules keyed by CLDR categories or specific numbers
   * @returns The ordinal form of the number, as a React node
   */
  export function Ordinal(
    props: { _: number } & PropsWithJSXSafeKeys<NumeralOptions>,
  ): ReactNode;

  /**
   * Define a select message, useful for handling gender, status, or other categories.
   *
   * @example
   * ```tsx
   * <Say.Select
   *   _={gender}
   *   male="He"
   *   female="She"
   *   other="They"
   * />
   * ```
   *
   * @param props._ Selector value to determine which option is chosen
   * @param props Options a mapping of possible selector values to message strings
   * @returns The select form of the value, as a React node
   */
  export function Select(
    props: { _: string } & PropsWithJSXSafeKeys<SelectOptions>,
  ): ReactNode;
}

throw new Error(
  'You are importing "@sayable/react" directly. ' +
    'This module is not meant to be used at runtime. ' +
    'Instead, use a compiler and the sayable plugin to compile macros into executable code.',
);
