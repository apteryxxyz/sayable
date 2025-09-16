export type ReactifyProps<T> = {
  [K in keyof T as K extends number ? `_${K}` : K]: T[K];
};
