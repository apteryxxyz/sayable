import { describe, expect, it } from 'vitest';
import { functions } from './functions.js';
import { options } from './options.js';
import { duration, numeric, temporal } from './values.js';
import { compile } from './index.js';

/**
 * `Say.call` only ever asks a message for a string, so the parts side of every
 * value, and the operand coercions a hand-written catalogue can reach that the
 * macros cannot author, are exercised here against `compile` directly.
 */

const when = new Date(2020, 0, 2, 12, 4, 5);

/** Format, failing on the errors `MessageFormat` would otherwise only warn about. */
function format(message: string, values: Record<string, unknown> = {}) {
  const errors: unknown[] = [];
  const result = compile('en-US', message).format(values, (e) => errors.push(e));
  if (errors.length > 0) throw errors[0];
  return result.replaceAll(/[⁨⁩]/g, '');
}

function parts(message: string, values: Record<string, unknown> = {}) {
  return compile('en-US', message).formatToParts(values, (e) => {
    throw e;
  });
}

describe('operands', () => {
  it('reads a number written as a string or a wrapper', () => {
    expect(numeric('42')).toBe(42);
    expect(numeric({ valueOf: () => 42 })).toBe(42);
  });

  // A bigint is passed through rather than narrowed, since the precision is the
  // whole point of writing one
  it('keeps a bigint a bigint', () => {
    expect(numeric(10n ** 25n)).toBe(10n ** 25n);
    expect(format('{n, number}', { n: 10n ** 25n })).toBe('10,000,000,000,000,000,000,000,000');
  });

  it('throws for a value that is not a number', () => {
    expect(() => numeric('nope')).toThrow('Input is not numeric');
    expect(() => format('{n, number}', { n: 'nope' })).toThrow('Input is not numeric');
  });

  // `undefined` is a missing value rather than a bad one, and MF2 reports the
  // missing variable itself
  it('treats a missing number as NaN rather than an error', () => {
    expect(numeric(undefined)).toBeNaN();
  });

  it.each([
    ['a Date', when],
    ['an epoch offset', when.getTime()],
    ['a parseable string', when.toISOString()],
    ['a wrapper', { valueOf: () => when.getTime() }],
  ])('reads a date written as %s', (_form, value) => {
    expect(temporal(value).getTime()).toBe(when.getTime());
    expect(format('{d, date, short}', { d: value })).toBe('1/2/2020');
  });

  it('throws for a value that is not a date', () => {
    expect(() => temporal('nope')).toThrow('Input is not a valid date');
    expect(() => temporal(null)).toThrow('Input is not a valid date');
    expect(() => format('{d, date}', { d: 'nope' })).toThrow('Input is not a valid date');
  });
});

describe('formatted parts', () => {
  it.each([
    ['{n, number, ::currency/EUR}', { n: 1234.5 }, 'number'],
    ['{d, date, ::yyyyMMdd}', { d: when }, 'datetime'],
  ])('reports %s as %s parts', (message, values, type) => {
    const [part] = parts(message, values) as [
      { type: string; locale: string; dir?: string; parts: unknown[] },
    ];
    expect(part.type).toBe(type);
    expect(part.locale).toBe('en-US');
    // The direction is a lazy getter off the resolved locale, and bidi
    // isolation is what asks for it
    expect(part.dir).toBe('ltr');
    expect(part.parts.length).toBeGreaterThan(0);
  });

  it('reports a duration as one part', () => {
    expect(parts('{n, duration}', { n: 61 })).toContainEqual(
      expect.objectContaining({ type: 'say:duration', value: '1:01' }),
    );
  });

  it('reports an unknown argument type as a string part', () => {
    expect(parts('{n, spellout}', { n: 42 })).toContainEqual(
      expect.objectContaining({ type: 'string', value: '42' }),
    );
  });

  it('reports a selector as a number part', () => {
    expect(parts('{n, plural, other {#}}', { n: 3 })).toContainEqual(
      expect.objectContaining({ type: 'number' }),
    );
  });
});

describe('selectors', () => {
  // Two selects asking the same question of the same argument are one selector.
  // Were they two, the variants would square rather than merge
  it('merges repeated selects on the same argument', () => {
    const message =
      '{n, plural, one {{g, select, f {her} other {their}} item}' +
      ' other {{n, plural, one {x} other {# items}}}}';
    expect(format(message, { n: 1, g: 'f' })).toBe('her item');
    expect(format(message, { n: 3, g: 'm' })).toBe('3 items');
  });

  // Same argument, different offset, is a different question and so stays a
  // separate selector
  it('keeps selects with different offsets apart', () => {
    const message = '{n, plural, offset:1 one {A#} other {{n, plural, one {B#} other {C#}}}}';
    expect(format(message, { n: 2 })).toBe('A1');
    expect(format(message, { n: 5 })).toBe('C5');
  });

  it('orders exact numbers before categories and other last', () => {
    const message = '{n, plural, other {many} one {a} =1 {exactly one} =0 {none}}';
    expect(format(message, { n: 0 })).toBe('none');
    expect(format(message, { n: 1 })).toBe('exactly one');
    expect(format(message, { n: 7 })).toBe('many');
  });

  it('selects an ordinal category', () => {
    const message = '{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}';
    expect(format(message, { n: 1 })).toBe('1st');
    expect(format(message, { n: 22 })).toBe('22nd');
    expect(format(message, { n: 11 })).toBe('11th');
  });

  it('offsets a bigint selector', () => {
    const message = '{n, plural, offset:1 one {# other} other {# others}}';
    expect(format(message, { n: 3n })).toBe('2 others');
  });

  it('falls through to other when no category matches', () => {
    expect(format('{g, select, f {her} other {their}}', { g: 'nope' })).toBe('their');
  });

  // A `#` inside a nested `select` still counts the plural enclosing it
  it('resolves a hash inside a select to the enclosing plural', () => {
    const message = '{n, plural, other {{g, select, other {# of them}}}}';
    expect(format(message, { n: 4, g: 'x' })).toBe('4 of them');
  });

  // Outside a plural there is nothing to substitute
  it('writes a hash outside a plural as text', () => {
    expect(format('a # b')).toBe('a # b');
    expect(format('{g, select, other {#}}', { g: 'x' })).toBe('#');
  });

  // Two placeholders running together leave no text between them to merge into
  it('keeps adjacent placeholders separate within a variant', () => {
    expect(format('{n, plural, other {{a}{b}}}', { n: 1, a: 'x', b: 'y' })).toBe('xy');
  });
});

describe('styles', () => {
  it('rejects a style containing a placeholder', () => {
    // Nothing can resolve `{x}` while the message is being compiled, and MF2
    // has no way to defer it
    expect(() => compile('en-US', '{d, date, {x}}')).toThrow('Unsupported style part: argument');
  });

  // `XXX` is ISO 4217's "no currency", which is what a pattern naming a
  // currency it has no code for should format as. `Intl` gives it the two
  // fraction digits a currency carries
  it('reads a currency out of a literal pattern', () => {
    // `Intl` separates a currency code from its amount with a non-breaking
    // space, which is a detail of the locale rather than of the conversion
    expect(format('{n, number, ¤¤#0}', { n: 12 }).replace(' ', ' ')).toBe('XXX 12.00');
  });

  it('falls back for a pattern asking for something Intl cannot express', () => {
    expect(format('{n, number, #E0}', { n: 1234.5 })).toBe('1,234.5');
  });

  // Every token parsed, there were simply none of them. There is no error to
  // report, so the skeleton is described rather than quoted back
  it('falls back for an empty skeleton', () => {
    expect(format('{d, date, ::}', { d: when })).toBe('Jan 2, 2020');
  });

  // `qqqq` is valid ICU, a stand-alone quarter, that `Intl` cannot show.
  // Keeping the fields that did resolve would render a date the message never
  // asked for, so one unshowable field fails the whole skeleton
  it('falls back rather than dropping a field it cannot show', () => {
    expect(format('{d, date, ::yMMMdqqqq}', { d: when })).toBe('Jan 2, 2020');
    expect(format("{d, date, ::yMMMd'x'}", { d: when })).toBe('Jan 2, 2020');
  });

  // The styles come from a plain object, so a key every object inherits must
  // not pass for one an author asked for
  it('rejects an inherited property name as a style', () => {
    expect(format('{d, date, toString}', { d: when })).toBe('Jan 2, 2020');
    expect(format('{d, date, constructor}', { d: when })).toBe('Jan 2, 2020');
  });
});

/**
 * A value's `valueOf` is only read when it becomes the operand of another
 * function, which no MF1 message can ask for, a duration or a string is always
 * the end of the line. They are called here directly so the contract they
 * publish is the one they keep.
 */
describe('message values', () => {
  const ctx = { locales: ['en-US'], localeMatcher: 'best fit' } as never;

  it('reports a duration as the seconds it was given', () => {
    expect(functions['say:duration'](ctx, {}, 61).valueOf()).toBe(61);
  });

  it('reports a number as the number it formatted', () => {
    expect(functions['say:number'](ctx, {}, 1234.5).valueOf!()).toBe(1234.5);
    // The scale is part of the value, not of the way it is written
    expect(functions['say:number'](ctx, { options: { scale: 1000 } }, 1.5).valueOf!()).toBe(1500);
  });

  it('reports a date as a Date', () => {
    expect(functions['say:datetime'](ctx, {}, when).valueOf!()).toStrictEqual(when);
  });

  // A plural reports the number the message was given, not the offset one it
  // prints, which is what lets a second selector offset from the right place
  it('reports a plural as the number before its offset', () => {
    const value = functions['say:plural'](ctx, { options: { offset: 1 } }, 3);
    expect(value.valueOf!()).toBe(3);
    expect(value.toString!()).toBe('2');
  });

  it('reports a string as itself', () => {
    expect(functions['say:string'](ctx, {}, 'x').valueOf()).toBe('x');
  });

  // A `select` on a value the caller never passed still has to choose a branch,
  // and `other` is the branch that takes it
  it('reads a missing string as empty', () => {
    const value = functions['say:string'](ctx, {}, undefined);
    expect(value.toString()).toBe('');
    expect(value.selectKey(new Set(['a']))).toBeNull();
    expect(value.selectKey(new Set(['']))).toBe('');
  });
});

describe('duration', () => {
  it.each([
    [Infinity, 'Infinity'],
    [Number.NaN, 'NaN'],
    [3600, '1:00:00'],
    [359999, '99:59:59'],
  ])('formats %o', (seconds, expected) => {
    expect(duration(seconds)).toBe(expected);
  });

  // Seconds are rounded to the millisecond, and a value that rounds up to a
  // whole minute has to carry rather than be written as `:60`
  it.each([
    [59.9999, '1:00'],
    [119.9999, '2:00'],
    [3599.9999, '1:00:00'],
    [59.5, '0:59.500'],
    [59.4994, '0:59.499'],
  ])('carries a rounded second in %o', (seconds, expected) => {
    expect(duration(seconds)).toBe(expected);
  });
});

describe('options', () => {
  // A placeholder with no style carries no bag, and the functions read one
  // either way
  it('reads an absent bag as empty', () => {
    expect(options(undefined)).toEqual({});
    expect(options(null)).toEqual({});
    expect(options({ style: 'percent' })).toEqual({ style: 'percent' });
  });
});
