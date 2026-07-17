import { describe, expect, it } from 'vitest';
import { resolveJsxSafePropKeys } from '~/types.js';

describe('resolveJsxSafePropKeys', () => {
  it('strips the leading underscore from `_<digits>` keys', () => {
    expect(resolveJsxSafePropKeys({ _0: 'a', _12: 'b' })).toEqual({ 0: 'a', 12: 'b' });
  });

  it('leaves other keys untouched', () => {
    expect(resolveJsxSafePropKeys({ name: 'a', _tag: 'b', _1x: 'c' })).toEqual({
      name: 'a',
      _tag: 'b',
      _1x: 'c',
    });
  });

  it('handles a mix of safe and unsafe keys', () => {
    expect(resolveJsxSafePropKeys({ _0: 'zero', label: 'hi' })).toEqual({ 0: 'zero', label: 'hi' });
  });
});
