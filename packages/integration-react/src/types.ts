export type PropsWithJSXSafeKeys<T> = {
  [K in keyof T as K extends number | `${number}${string}`
    ? `_${K}`
    : K extends `_${number}${string}`
      ? never
      : K]: T[K];
};

/**
 * Map the props the transform compiled a message's values into back to the
 * identifiers they carry. Every value is emitted with one underscore in front,
 * which is what keeps a numbered identifier a valid prop name and what keeps
 * any name a message chooses out of `Say`'s own namespace, so stripping exactly
 * one is the whole inverse — `_0` is `0`, and `__link` is a tag named `_link`.
 */
export function resolveValuePropKeys<T extends Record<string, unknown>>(
  props: T,
): T & Record<string | number, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in props) {
    if (key.startsWith('_')) result[key.slice(1)] = props[key];
    else result[key] = props[key];
  }
  return result as T;
}
