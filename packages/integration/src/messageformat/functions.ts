import type { MessageFunction } from 'messageformat/functions';
import { options, type NumberOptions, type PluralOptions } from './options.js';
import { duration, datetime, number, numeric, temporal } from './values.js';

/**
 * The handlers a compiled message resolves against.
 *
 * Every placeholder the conversion emits names one of these, and each takes its
 * whole configuration as a single already-resolved bag. A handler is therefore
 * only ever the last step — coerce the operand, apply the scale, call `Intl` —
 * and the work of reading a style stays in `styles.ts`, where it happens once
 * per message rather than once per format.
 */
export const functions = {
  'say:number': (ctx, opt, operand) => {
    const { scale, ...nf } = options<NumberOptions>(opt.options);
    const value = numeric(operand);
    return number(ctx.locales as string[], scale ? Number(value) * scale : value, nf);
  },

  'say:datetime': (ctx, opt, operand) =>
    datetime(ctx.locales as string[], temporal(operand), options(opt.options)),

  'say:duration': (_ctx, _opt, operand) => {
    const value = Number(numeric(operand));
    const str = duration(value);
    return {
      type: 'say:duration',
      toParts: () => [{ type: 'say:duration', value: str }],
      toString: () => str,
      valueOf: () => value,
    };
  },

  /**
   * The selector behind `plural` and `selectordinal`.
   *
   * An exact `=n` case is matched against the number as written, before the
   * offset, so `=1` still means one. The category is chosen from the offset
   * number instead — which is what lets "You and 2 others" branch on a total of
   * three — and that same offset number is what a `#` in the branch prints.
   */
  'say:plural': (ctx, opt, operand) => {
    const { offset = 0, ordinal = false } = options<PluralOptions>(opt.options);
    const value = numeric(operand);
    const shifted = typeof value === 'bigint' ? value - BigInt(offset) : value - offset;

    const result = number(ctx.locales as string[], shifted, {});
    // The offset number is what `#` prints, but the original is what the value
    // *is* — so a second selector reading this one offsets from the number the
    // message was given rather than from an already-shifted one.
    result.valueOf = () => value;
    result.selectKey = (keys) => {
      const exact = String(value);
      if (keys.has(exact)) return exact;
      // `Intl.PluralRules` takes a number, never a bigint.
      const category = new Intl.PluralRules(ctx.locales as string[], {
        localeMatcher: ctx.localeMatcher,
        type: ordinal ? 'ordinal' : 'cardinal',
      }).select(Number(shifted));
      return keys.has(category) ? category : null;
    };
    return result;
  },

  /** The selector behind `select`, and the fallback for an argument type we do not know. */
  'say:string': (_ctx, _opt, operand) => {
    const str = operand === undefined ? '' : String(operand);
    return {
      type: 'string',
      selectKey: (keys) => (keys.has(str) ? str : null),
      toParts: () => [{ type: 'string', value: str }],
      toString: () => str,
      valueOf: () => str,
    };
  },
} satisfies Record<string, MessageFunction<string, string>>;
