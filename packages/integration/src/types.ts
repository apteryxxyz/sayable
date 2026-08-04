export type Tuple = [any, ...any[]];

export type Disallow<T, K extends PropertyKey> = T & Partial<Record<K, never>>;

export type Awaitable<T> = T | PromiseLike<T>;

/**
 * A value wrapped in the name its ICU placeholder should take, written inline
 * as a single-key object: `` say`Total: ${{ cartTotal: getTotal() }}` ``. The
 * transform reads the key at build time and compiles only the value, so this
 * is never a real object at runtime.
 */
export type Named<T> = { [name: string]: T };

export interface NumeralOptions extends Omit<
  Partial<Record<Intl.LDMLPluralRule, string>>,
  'other'
> {
  other: string;
  [digit: number]: string;
  /**
   * Subtracted from the value before `#` is formatted, so "You and 2 others"
   * can select on a total of three. Reserved — it never names a branch.
   */
  offset?: number;
}

export interface SelectOptions {
  other: string;
  [match: string | number]: string;
}

/**
 * Formatting for a `{arg, number}` placeholder.
 *
 * `currency` is not offered: MF1 has nowhere to write the currency code, so
 * `{price, number, currency}` formats as a literal `{$price}` rather than an
 * amount. A literal pattern such as `#,##0.00` is accepted for the cases the
 * named styles do not cover.
 */
export interface NumberOptions {
  style?: 'integer' | 'percent' | (string & {});
}

/**
 * Formatting for a `{arg, date}` or `{arg, time}` placeholder.
 */
export interface DateTimeOptions {
  style?: 'short' | 'medium' | 'long' | 'full';
}
