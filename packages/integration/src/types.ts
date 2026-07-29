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
}

export interface SelectOptions {
  other: string;
  [match: string | number]: string;
}
