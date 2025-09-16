export type Disallow<K extends PropertyKey> = Partial<Record<K, never>>;

export type Awaitable<T> = T | PromiseLike<T>;

export interface NumeralOptions
  extends Omit<Partial<Record<Intl.LDMLPluralRule, string>>, 'other'> {
  other: string;
  [digit: number]: string;
}

export interface SelectOptions {
  other: string;
  [match: PropertyKey]: string;
}
