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
 * `Branch` is what a case may be written as: text everywhere the message is
 * text, widening in JSX, where a case showing the number has to be a fragment.
 */
export interface NumeralOptions<Branch = string> extends Omit<
  Partial<Record<Intl.LDMLPluralRule, Branch>>,
  'other'
> {
  other: Branch;
  [digit: number]: Branch;
  /**
   * Subtracted from the value before `#` is formatted, so "You and 2 others"
   * can select on a total of three. Reserved, it never names a branch.
   */
  offset?: number;
}

export interface SelectOptions<Branch = string> {
  other: Branch;
  [match: string | number]: Branch;
}

/**
 * An ICU skeleton: a `::`-prefixed description of the parts a value is written
 * with, rather than a name for a whole format. `::currency/EUR` and
 * `::yyyyMMdd` say what to show and leave the arrangement to the locale.
 *
 * A skeleton is where the formats the named styles have no word for live:
 * currency, compact notation, a year and month with no day.
 */
export type Skeleton = `::${string}`;

/**
 * Formatting for a `{arg, number}` placeholder.
 *
 * A literal `NumberFormat` pattern such as `#,##0.00` is also accepted, for the
 * cases neither the named styles nor a skeleton spell more clearly.
 */
export interface NumberOptions {
  style?: 'integer' | 'percent' | Skeleton | (string & {});
}

/** Formatting for a `{arg, date}` or `{arg, time}` placeholder. */
export interface DateTimeOptions {
  style?: 'short' | 'medium' | 'long' | 'full' | Skeleton;
}
