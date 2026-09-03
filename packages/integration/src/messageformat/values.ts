import { getLocaleDir, type MessageValue } from 'messageformat/functions';

/**
 * A formatted part carries its direction only when it is known to be one of
 * the two a reader can be isolated from. `auto` means undetermined, which the
 * absence of the key says.
 */
function part<T extends string, P>(type: T, locale: string, parts: P[]) {
  const dir = getLocaleDir(locale);
  // The locale came back from `Intl`, so its direction is one of the two
  /* v8 ignore next 3 */
  return dir === 'ltr' || dir === 'rtl' ? { type, dir, locale, parts } : { type, locale, parts };
}

/**
 * The resolved values a placeholder formats to.
 *
 * Each is a thin wrapper over one `Intl` formatter, built lazily and kept:
 * `formatToParts` and `format` are often both asked of the same value, and
 * constructing the formatter is the expensive half.
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
 * Any scaling has already been applied to `value`, a scale is a multiplier on
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
 * `Intl` has no equivalent, since `DurationFormat` writes "1 hr, 2 min" rather
 * than a clock reading, so this is the one format written out by hand.
 */
export function duration(seconds: number): string {
  if (!Number.isFinite(seconds)) return String(seconds);

  const sign = seconds < 0 ? '-' : '';

  // Round to the millisecond *before* splitting the value up: a seconds field
  // of 59.9999 rounds to `60`, which has to carry into the minutes
  const total = Math.round(Math.abs(seconds) * 1000) / 1000;

  const secs = total % 60;
  const minutes = Math.floor(total / 60);
  const hours = Math.floor(minutes / 60);

  // A fractional second stays a string from here on, since `Number('1.500')`
  // would undo the rounding
  const written = Math.round(secs) === secs ? String(secs) : secs.toFixed(3);

  // One `:` is always written, so a sub-minute duration still reads as one
  const parts: (string | number)[] =
    hours > 0 ? [hours, minutes % 60, written] : [minutes, written];

  // Every part but the first is padded to two digits: `1:01:01`, never
  // `01:01:01`. Judged from the value, so `1.500` pads like the 1 it is
  const first = parts.shift()!;
  const pad = (n: string | number) => (Number(n) < 10 ? `0${n}` : String(n));
  return sign + [first, ...parts.map(pad)].join(':');
}
