import { parse } from '@messageformat/parser';
import { MessageFormat } from 'messageformat';
import { toMessage } from './convert.js';
import { functions } from './functions.js';

/**
 * ICU MessageFormat 1, compiled in-tree.
 *
 * `@messageformat/icu-messageformat-1` does this already, and this folder owes
 * it the select-flattening in `convert.ts`. What it cannot do is a skeleton on
 * a date: it renders an argument's style into MF2's own option vocabulary, and
 * that vocabulary has no room for one. `{d, date, ::yyyyMMdd}` survives the
 * trip only as an unrecognised `mf1:argStyle`, which the formatter then reports
 * as a bad option and renders as a fallback.
 *
 * Owning the conversion lets a style skip that vocabulary. A skeleton is
 * resolved to an `Intl` options bag while the message is compiled, carried
 * whole through the message data, and handed to `Intl` at format time — so
 * `::yyyyMMdd` and `::currency/EUR` arrive by the same route as `short` and
 * `integer`, and cost the same.
 *
 * The pipeline reads in one direction:
 *
 * - `styles.ts` — an argument style becomes `Intl` options
 * - `options.ts` — the seam those options travel through
 * - `convert.ts` — the MF1 tree becomes an MF2 message
 * - `values.ts` / `functions.ts` — what the formatter runs
 */

/**
 * Compile an ICU MessageFormat 1 message for a locale.
 *
 * @param locale Locale to format in
 * @param source The message, in ICU MessageFormat 1 syntax
 * @returns A formatter for the message
 * @throws If the message is not valid ICU MessageFormat 1
 */
export function compile(locale: string, source: string) {
  return new MessageFormat(locale, toMessage(parse(source)), { functions });
}
