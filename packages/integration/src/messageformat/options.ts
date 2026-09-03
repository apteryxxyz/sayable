import type { Model } from 'messageformat';

/**
 * Carry an `Intl` options bag whole, from conversion to formatting.
 *
 * MF2 declares an option value as a literal string, and nothing in between
 * inspects it: the resolver hands a literal to the function verbatim. So an
 * already-parsed bag travels the same path unchanged, and a style is parsed
 * once at compile rather than on every format.
 *
 * This is the one seam between the two halves of this folder: `styles.ts` fills
 * a bag, `functions.ts` empties it, and nothing else looks inside.
 */
export const literal = <T>(value: T) => ({ type: 'literal', value }) as unknown as Model.Literal;

/**
 * Read back an options bag placed by {@link literal}.
 *
 * A message reaching the formatter came through `compile`, so the bag is the
 * one put there. The guard covers an absent value, which is how a placeholder
 * with no style is written.
 */
export function options<T extends object>(value: unknown): T {
  return typeof value === 'object' && value !== null ? (value as T) : ({} as T);
}

/** The extra key a number's bag may carry, which `Intl` has no option for. */
export type NumberOptions = Intl.NumberFormatOptions & { scale?: number };

/** How a `plural` or `selectordinal` selector was written. */
export type PluralOptions = { offset?: number; ordinal?: boolean };
