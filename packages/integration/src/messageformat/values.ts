import { getLocaleDir, type MessageValue } from 'messageformat/functions';

/**
 * A formatted part carries its direction only when that direction is known to
 * be one of the two a reader can be isolated from. `auto` means undetermined,
 * and saying so is what the absence of the key means.
 */
function part<T extends string, P>(type: T, locale: string, parts: P[]) {
  const dir = getLocaleDir(locale);
  // The locale here always came back from `Intl`, so its direction is always
  // one of the two. The `auto` case is what an unresolvable locale would give.
  /* v8 ignore next 3 */
  return dir === 'ltr' || dir === 'rtl' ? { type, dir, locale, parts } : { type, locale, parts };
}

/**
 * The resolved values a placeholder formats to.
 *
 * Each is a thin wrapper over one `Intl` formatter: MF2 asks a value for a
 * string or for parts, and both questions are the formatter's to answer. The
 * formatter is built lazily and kept, because `formatToParts` and `format` are
 * often both asked of the same value and constructing an `Intl` formatter is
 * the expensive half of formatting.
 */

// ===== Operands ===== //

/**
 * Read a numeric operand.
 *
 * A `bigint` is passed through rather than narrowed to `number`, since the
 * point of one is the precision that conversion would lose.
 *
 * @throws If the value is not a number
 */
export function numeric(operand: unknown): number | bigint {
  const value = typeof operand === 'object' && operand !== null ? operand.valueOf() : operand;
  if (typeof value === 'bigint') return value;
  const number = Number(value);
  if (Number.isNaN(number) && value !== undefined) throw new Error('Input is not numeric');
  return number;
}

/**
 * Read a date operand, which may be written as a `Date`, an epoch offset, or
 * anything `Date` can parse.
 *
 * @throws If the value is not a date
 */
export function temporal(operand: unknown): Date {
  let value = operand;
  if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    value = value.valueOf();
  }
  if (typeof value === 'number' || typeof value === 'string') value = new Date(value);
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error('Input is not a valid date');
  }
  return value;
}

// ===== Values ===== //

/**
 * A number formatted by an `Intl.NumberFormat` options bag.
 *
 * Any scaling has already been applied to `value` — a scale is a multiplier on
 * the number, not a way of writing it, so it belongs to the caller.
 */
export function number(
  locales: string[],
  value: number | bigint,
  opt: Intl.NumberFormatOptions,
): MessageValue<'number'> {
  let nf: Intl.NumberFormat | undefined;
  let locale: string | undefined;
  const format = () => (nf ??= new Intl.NumberFormat(locales, opt));
  const resolved = () => (locale ??= format().resolvedOptions().locale);

  return {
    type: 'number',
    get dir() {
      return getLocaleDir(resolved());
    },
    get options() {
      return { ...opt };
    },
    toParts: () => [part('number', resolved(), format().formatToParts(value))],
    toString: () => format().format(value),
    valueOf: () => value,
  };
}

/**
 * A date or time formatted by an `Intl.DateTimeFormat` options bag.
 *
 * `date` and `time` share this: by the time a style has resolved, the two
 * differ only in which fields their bag names.
 */
export function datetime(
  locales: string[],
  value: Date,
  opt: Intl.DateTimeFormatOptions,
): MessageValue<'datetime'> {
  let dtf: Intl.DateTimeFormat | undefined;
  let locale: string | undefined;
  const format = () => (dtf ??= new Intl.DateTimeFormat(locales, opt));
  const resolved = () => (locale ??= format().resolvedOptions().locale);

  return {
    type: 'datetime',
    get dir() {
      return getLocaleDir(resolved());
    },
    get options() {
      return { ...opt };
    },
    toParts: () => [part('datetime', resolved(), format().formatToParts(value))],
    toString: () => format().format(value),
    valueOf: () => value,
  };
}

/**
 * `hhhh:mm:ss`, MF1's `duration` argument type.
 *
 * `Intl` has no equivalent — `DurationFormat` writes "1 hr, 2 min", not a clock
 * reading — so this is the one format written out by hand.
 */
export function duration(seconds: number): string {
  if (!Number.isFinite(seconds)) return String(seconds);

  const sign = seconds < 0 ? '-' : '';
  let value = Math.abs(seconds);

  // A fractional second stays a string from here on. Rounding it to three
  // places is the whole point, and `Number('1.500')` would undo that.
  const secs = value % 60;
  const parts: (string | number)[] = [Math.round(secs) === secs ? secs : secs.toFixed(3)];
  if (value < 60) {
    // One `:` is always written, so a sub-minute duration still reads as a
    // duration rather than as a bare number of seconds.
    parts.unshift(0);
  } else {
    value = Math.round((value - Number(parts[0])) / 60);
    parts.unshift(value % 60);
    if (value >= 60) parts.unshift(Math.round((value - Number(parts[0])) / 60));
  }

  // Every part but the first is padded to two digits, and the leading one is
  // not — a duration reads as `1:01:01`, never `01:01:01`. The width is judged
  // from the value rather than the text, so `1.500` pads like the 1 it is.
  const first = parts.shift()!;
  const pad = (n: string | number) => (Number(n) < 10 ? `0${n}` : String(n));
  return sign + [first, ...parts.map(pad)].join(':');
}
