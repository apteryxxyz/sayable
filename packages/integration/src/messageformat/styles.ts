import { getDateTimeFormatOptions, parseDateTokens } from '@messageformat/date-skeleton';
import {
  getNumberFormatOptions,
  parseNumberPattern,
  parseNumberSkeleton,
} from '@messageformat/number-skeleton';
import type { NumberOptions } from './options.js';

/**
 * An argument style, resolved to the `Intl` options it asks for.
 *
 * This is the half of the conversion that MF2's own option vocabulary cannot
 * do. That vocabulary tops out at `{ length, fields }` for a date — a coarse
 * `short`/`medium`/`long`/`full` and nothing else — so a skeleton has nowhere
 * to land. Both skeleton parsers already emit `Intl` option bags, which is the
 * form the formatter wants anyway, so a style resolves straight to one and
 * skips the vocabulary entirely.
 */

/** A style the conversion could not read. */
export class StyleError extends Error {}

/**
 * ICU's named date lengths, as the fields each one shows.
 *
 * MF1 names a length and leaves the fields to the locale; `Intl` wants both, so
 * the names expand here. `full` and `long` differ only in the weekday, which is
 * what distinguishes them in CLDR's own patterns.
 */
const DATE_STYLES = {
  short: { year: 'numeric', month: 'numeric', day: 'numeric' },
  medium: { year: 'numeric', month: 'short', day: 'numeric' },
  long: { year: 'numeric', month: 'long', day: 'numeric' },
  full: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

const TIME_STYLES = {
  short: { hour: 'numeric', minute: 'numeric' },
  medium: { hour: 'numeric', minute: 'numeric', second: 'numeric' },
  long: { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' },
  full: { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'long' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

/**
 * Turn a `date` or `time` argument style into `Intl.DateTimeFormat` options.
 *
 * A `::`-prefixed style is an ICU skeleton — `::yyyyMMdd`, `::HHmm` — naming
 * the fields to show and leaving their arrangement to the locale. The named
 * styles are looked up instead, and an empty style takes MF1's own default.
 *
 * @throws {StyleError} If the style names no fields
 */
export function dateTimeStyle(kind: 'date' | 'time', style: string): Intl.DateTimeFormatOptions {
  const named = kind === 'date' ? DATE_STYLES : TIME_STYLES;

  if (style.startsWith('::')) {
    const errors: string[] = [];
    const tokens = parseDateTokens(style.slice(2));
    const opt = getDateTimeFormatOptions(tokens, (_type, message) => errors.push(message));
    // A skeleton that yielded nothing usable is a typo, not a format. Falling
    // back to the locale default here would silently show the wrong fields.
    if (Object.keys(opt).length === 0) throw new StyleError(errors[0] ?? `Empty skeleton ${style}`);
    return opt;
  }

  // MF1's own default, for both `date` and `time`, is `medium`.
  if (style === '') return named.medium;
  if (style in named) return named[style as keyof typeof named];
  throw new StyleError(`Unsupported ${kind} style ${style}`);
}

/**
 * Turn a `number` argument style into `Intl.NumberFormat` options.
 *
 * Three forms reach here: MF1's named styles, a `::`-prefixed skeleton, and a
 * literal pattern such as `#,##0.00`.
 *
 * The named styles are expanded here rather than handed to a parser, because
 * neither parser recognises them — they are MF1 vocabulary, and the pattern
 * parser reads `percent` as seven literal characters. `currency` is not among
 * them: MF1 has nowhere to write the code, so it is left to fall back to a
 * plain number, and `::currency/EUR` is how a currency is asked for.
 *
 * `scale` comes back out alongside the bag rather than inside it, because it
 * multiplies the value and `Intl` has no option for that.
 *
 * @throws {StyleError} If the style is not valid, or asks for something `Intl`
 *   cannot express
 */
export function numberStyle(style: string): NumberOptions {
  if (style === '') return {};
  if (style === 'integer') return { maximumFractionDigits: 0 };
  // `Intl` scales a percent itself, so this is the whole of ICU's
  // `scale/100 percent`.
  if (style === 'percent') return { style: 'percent' };

  const errors: string[] = [];
  const onError = (error: unknown) => errors.push(String(error));

  // `parseNumberPattern` wants a currency code for the `¤` token, and a pattern
  // without one never uses it. `XXX` is ISO 4217's "no currency" code, which is
  // what an unadorned pattern should format as if one slips through.
  const skeleton = style.startsWith('::')
    ? parseNumberSkeleton(style.slice(2), onError)
    : parseNumberPattern(style, 'XXX', onError);

  let scale: number | undefined;
  const opt: Intl.NumberFormatOptions = getNumberFormatOptions(skeleton, (stem, option) => {
    if (stem === 'scale') scale = Number(option);
    else errors.push(`Unsupported number stem ${stem}`);
  });

  if (errors.length > 0) throw new StyleError(errors[0]!);

  // Double-scaling is not a risk here: `percent scale/100` is the one scale
  // `Intl` can express, and the parser folds it into `style: 'percent'` rather
  // than reporting it. Anything still reported — `::scale/1000` — is ours.
  return scale === undefined ? opt : { ...opt, scale };
}
