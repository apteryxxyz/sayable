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

/**
 * Branches of a choice, keyed by CLDR category or by exact number.
 *
 * `Branch` is what a case may be written as. It is text everywhere the message
 * is text, and widens in JSX, where a case that shows the number has to be a
 * fragment — a string attribute has nowhere to put a value.
 */
export interface NumeralOptions<Branch = string> extends Omit<
  Partial<Record<Intl.LDMLPluralRule, Branch>>,
  'other'
> {
  other: Branch;
  [digit: number]: Branch;
  /**
   * Subtracted from the value before `#` is formatted, so "You and 2 others"
   * can select on a total of three. Reserved — it never names a branch.
   */
  offset?: number;
}

export interface SelectOptions<Branch = string> {
  other: Branch;
  [match: string | number]: Branch;
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
