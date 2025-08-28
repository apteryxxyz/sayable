export type Disallow<K extends PropertyKey> = Partial<Record<K, never>>;

export type Awaitable<T> = T | PromiseLike<T>;

export type Loadable<T> = T | { default: T };

export type Callable<T> = T | (() => T);

export type Resolvable<T> = Callable<Awaitable<Loadable<T>>>;

export type Resolved<T> = T extends Resolvable<infer U> ? Awaitable<U> : T;

export function resolve<T>(value: Resolvable<T>): Resolved<T> {
  if (typeof value === 'function') return resolve((value as () => T)());
  if (typeof value === 'object' && value) {
    if ('then' in value && typeof value.then === 'function')
      return value.then(resolve) as Resolved<T>;
    if ('default' in value) return resolve(value.default);
  }
  return value as Resolved<T>;
}

//

export interface NumeralOptions {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
  [digit: number]: string;
}

export interface SelectOptions {
  other: string;
  [match: PropertyKey]: string;
}

export interface NumeralDescriptor extends NumeralOptions {
  id: string;
}

export interface SelectDescriptor extends SelectOptions {
  id: string;
}

export type Descriptor =
  | NumeralDescriptor
  | SelectDescriptor
  | { id: string; [match: string]: string };
