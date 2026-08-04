/**
 * The ICU argument types a macro can author, and the named styles each accepts.
 *
 * `currency` is deliberately absent from `number`. MF1 has nowhere to write the
 * currency code — it comes from the formatter's configuration, not the message
 * — so `{price, number, currency}` formats as a literal `{$price}` at runtime
 * rather than an amount. Currency belongs to number skeletons, which the
 * formatter does not accept yet either.
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
 * A literal `NumberFormat` pattern, e.g. `#,##0.00`. ICU reserves braces for
 * its own pattern syntax, so a style that carries one would close the argument
 * early and take the rest of the message with it.
 */
const LITERAL_STYLE_PATTERN = /^[^{}\r\n]+$/;

/**
 * Reject an argument style the formatter cannot honour, while the style is
 * still attached to a file and a line.
 *
 * A style is a bare string in the source and a bare string in the catalogue, so
 * nothing between here and the runtime has an opinion about it. Left unchecked,
 * a typo like `{d, date, meduim}` extracts to a catalogue entry that looks
 * perfectly normal and only misformats once it reaches a user.
 */
export function validateArgumentStyle(type: ArgumentType, style: string) {
  const named: readonly string[] = ARGUMENT_STYLES[type];
  if (named.includes(style)) return;

  // A number's style may also be a literal pattern, which is open-ended and so
  // can only be checked for the syntax it would break.
  if (type === 'number' && LITERAL_STYLE_PATTERN.test(style)) return;

  const expected = named.map((s) => `'${s}'`).join(', ');
  throw new Error(
    `Invalid ${type} style '${style}', expected ${expected}` +
      (type === 'number' ? ', or a literal number pattern such as #,##0.00' : ''),
  );
}
