import { describe, expect, it } from 'vitest';
import { ARGUMENT_TYPES, isArgumentType, validateArgumentStyle } from './format.js';

describe('isArgumentType', () => {
  it.each(ARGUMENT_TYPES)('claims %s', (type) => {
    expect(isArgumentType(type)).toBe(true);
  });

  it('rejects a type the formatter cannot honour', () => {
    expect(isArgumentType('spellout')).toBe(false);
    expect(isArgumentType('duration')).toBe(false);
    expect(isArgumentType('choice')).toBe(false);
  });

  // The types come from a plain object, so a key every object inherits must not
  // pass for one an author asked for.
  it('rejects an inherited property name', () => {
    expect(isArgumentType('toString')).toBe(false);
    expect(isArgumentType('constructor')).toBe(false);
  });
});

describe('validateArgumentStyle', () => {
  it.each([
    ['number', 'integer'],
    ['number', 'percent'],
    ['date', 'short'],
    ['date', 'full'],
    ['time', 'medium'],
    ['time', 'long'],
  ] as const)('accepts the %s style %s', (type, style) => {
    expect(() => validateArgumentStyle(type, style)).not.toThrow();
  });

  it('accepts a literal number pattern', () => {
    expect(() => validateArgumentStyle('number', '#,##0.00')).not.toThrow();
    expect(() => validateArgumentStyle('number', '0.###')).not.toThrow();
  });

  // A brace would close the argument early and take the rest of the message
  // with it, so it is rejected even though a number style is otherwise open.
  it('rejects a number pattern containing ICU pattern syntax', () => {
    expect(() => validateArgumentStyle('number', '#,##0{}')).toThrow('Invalid number style');
    expect(() => validateArgumentStyle('number', '#\n0')).toThrow('Invalid number style');
    expect(() => validateArgumentStyle('number', '')).toThrow('Invalid number style');
  });

  it('rejects an unknown date or time style', () => {
    expect(() => validateArgumentStyle('date', 'meduim')).toThrow(
      "Invalid date style 'meduim', expected 'short', 'medium', 'long', 'full'",
    );
    expect(() => validateArgumentStyle('time', 'relative')).toThrow('Invalid time style');
  });

  // Named for the runtime probe that motivated leaving it out: MF1 has nowhere
  // to write the currency code, so it formats as a literal `{$price}`.
  it('rejects the currency style, which the formatter cannot honour', () => {
    expect(() => validateArgumentStyle('date', 'currency')).toThrow('Invalid date style');
  });

  it('names the literal pattern escape only for numbers', () => {
    expect(() => validateArgumentStyle('number', '#{}')).toThrow('literal number pattern');
    expect(() => validateArgumentStyle('date', 'nope')).not.toThrow('literal number pattern');
  });
});
