import { getDateTimeFormatOptions, parseDateTokens } from '@messageformat/date-skeleton';
import { getNumberFormatOptions, parseNumberSkeleton } from '@messageformat/number-skeleton';

/**
 * The ICU argument types a macro can author, and the named styles each accepts.
 *
 * A style may also be a skeleton, which is where the formats these names have
 * no word for live — see {@link validateArgumentStyle}.
 *
 * `currency` is deliberately absent from `number`. MF1 has nowhere to write the
 * currency code — it comes from the formatter's configuration, not the message
 * — so `{price, number, currency}` formats as a bare number at runtime rather
 * than an amount. Currency belongs to a skeleton, `::currency/EUR`, which names
 * the code and which the formatter does honour.
 *
 * `spellout`, RBNF `ordinal`, and `choice` are absent by decision rather than
 * oversight: the first two are ICU4J/ICU4C rule-based formats with no `Intl`
 * equivalent, and the third is deprecated in ICU itself in favour of `plural`.
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
 * A pattern has to carry a digit placeholder — `#` or `0` — because that is
 * what makes it a pattern rather than a word. Without that requirement any
 * brace-free string qualifies, which quietly readmits the named styles this
 * module exists to reject: `currency` would sail through as a "pattern" and
 * extract to the `{price, number, currency}` the formatter cannot honour, and
 * so would a plain typo.
 *
 * Braces are excluded separately: ICU reserves them for its own pattern syntax,
 * so a style carrying one would close the argument early and take the rest of
 * the message with it.
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
 * A skeleton is the open-ended half of a style, so unlike a named style it
 * cannot be checked against a list. It can be checked by doing the work: the
 * parsers below are the same ones the runtime formats with, and a skeleton that
 * yields no options here is one that would format as nothing there.
 *
 * The runtime resolves the same skeletons in `saykit`'s
 * `messageformat/styles.ts` and falls back to a default format when one does
 * not resolve. This is the check that means an author sees the problem first,
 * with a file and a line, rather than a reader seeing the wrong date.
 *
 * @returns The reason the skeleton is invalid, or `undefined` if it is valid
 */
function invalidSkeleton(type: ArgumentType, skeleton: string): string | undefined {
  if (skeleton === '') return 'it names no fields';

  const errors: string[] = [];

  if (type === 'number') {
    const parsed = parseNumberSkeleton(skeleton, (error) => errors.push(String(error)));
    // `scale` is a multiplier rather than a formatting option, so the runtime
    // applies it itself; it is reported here but is not an error.
    getNumberFormatOptions(parsed, (stem) => {
      if (stem !== 'scale') errors.push(`unsupported stem '${stem}'`);
    });
    return errors[0];
  }

  const tokens = parseDateTokens(skeleton);
  const options = getDateTimeFormatOptions(tokens, (_type, message) => errors.push(message));
  if (errors.length > 0) return errors[0];
  // Every token was understood but none of them named a field `Intl` can show.
  if (Object.keys(options).length === 0) return 'it names no fields';
  return undefined;
}

/**
 * Reject an argument style the formatter cannot honour, while the style is
 * still attached to a file and a line.
 *
 * A style is a bare string in the source and a bare string in the catalogue, so
 * nothing between here and the runtime has an opinion about it. Left unchecked,
 * a typo like `{d, date, meduim}` extracts to a catalogue entry that looks
 * perfectly normal and only misformats once it reaches a user.
 *
 * Three forms are accepted: a named style, a `::`-prefixed skeleton, and — for
 * a number — a literal pattern such as `#,##0.00`.
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
  // can only be checked for the syntax it would break.
  if (type === 'number' && LITERAL_STYLE_PATTERN.test(style)) return;

  const expected = named.map((s) => `'${s}'`).join(', ');
  throw new Error(
    `Invalid ${type} style '${style}', expected ${expected}, or a skeleton such as ` +
      (type === 'number' ? '::currency/EUR' : '::yyyyMMdd') +
      (type === 'number' ? ', or a literal number pattern such as #,##0.00' : ''),
  );
}
