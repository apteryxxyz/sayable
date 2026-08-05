import type { Model } from 'messageformat';

/**
 * Carry an `Intl` options bag whole, from conversion to formatting.
 *
 * MF2 declares an option value as a literal string, and every formatter it
 * ships parses one back out of the string it was given. Nothing in between
 * inspects the value — the resolver hands a literal to the function verbatim —
 * so an already-parsed bag travels the same path unchanged, and a style is
 * parsed once when the message is compiled rather than on every format.
 *
 * This is the one seam between the two halves of this folder: `styles.ts` fills
 * a bag, `functions.ts` empties it, and nothing else looks inside.
 */
export const literal = <T>(value: T) => ({ type: 'literal', value }) as unknown as Model.Literal;

/**
 * Read back an options bag placed by {@link literal}.
 *
 * A message reaching the formatter always came through `compile`, so the bag is
 * the one put there. The guard covers the value being absent, which is how a
 * placeholder with no style is written.
 */
export function options<T extends object>(value: unknown): T {
  return typeof value === 'object' && value !== null ? (value as T) : ({} as T);
}

/** The extra key a number's bag may carry, which `Intl` has no option for. */
export type NumberOptions = Intl.NumberFormatOptions & { scale?: number };

/** How a `plural` or `selectordinal` selector was written. */
export type PluralOptions = { offset?: number; ordinal?: boolean };
