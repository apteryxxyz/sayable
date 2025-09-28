export type PropsWithJSXSafeKeys<T> = {
  [K in keyof T as K extends number ? `_${K}` : K]: T[K];
};

export function decodeJsxSafePropKeys<T extends Record<string, unknown>>(
  props: T,
) {
  const result: Record<string, unknown> = {};
  for (const key in props) {
    if (/^_\d+$/.test(key)) result[key.slice(1)] = props[key];
    else result[key] = props[key];
  }
  return result as T;
}
