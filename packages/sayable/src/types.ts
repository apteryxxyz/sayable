export type Disallow<K extends PropertyKey> = Partial<Record<K, never>>;

export interface PluralOptions {
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
  [match: string]: string;
}

export interface PlainDescriptor {
  id: string;
  [match: string]: string;
}

export interface PluralDescriptor extends PluralOptions {
  id: string;
}

export interface SelectDescriptor extends SelectOptions {
  id: string;
}

export type Descriptor = PlainDescriptor | PluralDescriptor | SelectDescriptor;
