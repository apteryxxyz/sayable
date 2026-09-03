import { getDateTimeFormatOptions, parseDateTokens } from '@messageformat/date-skeleton';
import { getNumberFormatOptions, parseNumberSkeleton } from '@messageformat/number-skeleton';

/**
 * The ICU argument types a macro can author, and the named styles each accepts.
 *
 * A style may also be a skeleton, which is where the formats these names have
 * no word for live; see {@link validateArgumentStyle}.
 *
 * `currency` is deliberately absent from `number`: MF1 has nowhere to write the
 * code, so `{price, number, currency}` formats as a bare number. Currency
 * belongs to a skeleton, `::currency/EUR`, which the formatter does honour.
 *
 * `spellout`, RBNF `ordinal` and `choice` are absent by decision: the first two
 * are ICU4J/ICU4C rule-based formats with no `Intl` equivalent, and the third
 * is deprecated in ICU itself in favour of `plural`.
 */
export const ARGUMENT_STYLES = {
  number: ['integer', 'percent'],
  date: ['short', 'medium', 'long', 'full'],
  time: ['short', 'medium', 'long', 'full'],
} as const;

export type ArgumentType = keyof typeof ARGUMENT_STYLES;

export const ARGUMENT_TYPES = Object.keys(ARGUMENT_STYLES) as ArgumentType[];

export function isArgumentType(kind: string): kind is ArgumentType {
  return Object.hasOwn(ARGUMENT_STYLES, kind);
}

/**
 * A literal `NumberFormat` pattern, e.g. `#,##0.00`.
 *
 * A pattern has to carry a digit placeholder, `#` or `0`, since that is what
 * makes it a pattern rather than a word. Without it any brace-free string
 * qualifies, readmitting the named styles this module exists to reject:
 * `currency` would sail through as a "pattern", and so would a typo.
 *
 * Braces are excluded separately, since a style carrying one would close the
 * ICU argument early and take the rest of the message with it.
 */
const LITERAL_STYLE_PATTERN = /^[^{}\r\n]*[#0][^{}\r\n]*$/;

/**
 * An ICU skeleton: a `::`-prefixed description of the parts a value is written
 * with, rather than a name for a whole format.
 */
const SKELETON = '::';

/**
 * Check a skeleton by resolving it, and report what stopped it resolving.
 *
 * A skeleton is the open-ended half of a style, so it cannot be checked against
 * a list. It can be checked by doing the work: the parsers below are the ones
 * the runtime formats with, so a skeleton yielding no options here would format
 * as nothing there.
 *
 * The runtime falls back to a default format when one does not resolve, so this
 * is the check that means an author sees the problem first, with a file and a
 * line, rather than a reader seeing the wrong date.
 *
 * @returns The reason the skeleton is invalid, or `undefined` if it is valid
 */
function invalidSkeleton(type: ArgumentType, skeleton: string): string | undefined {
  if (skeleton === '') return 'it names no fields';

  const errors: string[] = [];

  if (type === 'number') {
    const parsed = parseNumberSkeleton(skeleton, (error) => errors.push(String(error)));
    // `scale` is a multiplier rather than a formatting option, so the runtime
    // applies it itself; it is reported here but is not an error
    getNumberFormatOptions(parsed, (stem) => {
      if (stem !== 'scale') errors.push(`unsupported stem '${stem}'`);
    });
    return errors[0];
  }

  const tokens = parseDateTokens(skeleton);
  const options = getDateTimeFormatOptions(tokens, (_type, message) => errors.push(message));
  if (errors.length > 0) return errors[0];
  // Every token was understood but none of them named a field `Intl` can show
  if (Object.keys(options).length === 0) return 'it names no fields';
  return undefined;
}

/**
 * Reject an argument style the formatter cannot honour, while the style is
 * still attached to a file and a line.
 *
 * A style is a bare string in the source and in the catalogue, so nothing
 * between here and the runtime has an opinion about it. Left unchecked, a typo
 * like `{d, date, meduim}` only misformats once it reaches a user.
 *
 * Three forms are accepted: a named style, a `::`-prefixed skeleton, and, for
 * a number, a literal pattern such as `#,##0.00`.
 */
export function validateArgumentStyle(type: ArgumentType, style: string) {
  const named: readonly string[] = ARGUMENT_STYLES[type];
  if (named.includes(style)) return;

  if (style.startsWith(SKELETON)) {
    const reason = invalidSkeleton(type, style.slice(SKELETON.length));
    if (!reason) return;
    throw new Error(`Invalid ${type} skeleton '${style}': ${reason}`);
  }

  // A number's style may also be a literal pattern, which is open-ended and so
  // can only be checked for the syntax it would break
  if (type === 'number' && LITERAL_STYLE_PATTERN.test(style)) return;

  const expected = named.map((s) => `'${s}'`).join(', ');
  throw new Error(
    `Invalid ${type} style '${style}', expected ${expected}, or a skeleton such as ` +
      (type === 'number' ? '::currency/EUR' : '::yyyyMMdd') +
      (type === 'number' ? ', or a literal number pattern such as #,##0.00' : ''),
  );
}
