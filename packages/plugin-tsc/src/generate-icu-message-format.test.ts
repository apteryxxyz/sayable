import { describe, expect, it } from 'vitest';
import { generateIcuMessageFormat } from './generate-icu-message-format.js';
import type { Message } from './message-types.js';

describe('generateIcuMessageFormat', () => {
  it('should generate literal messages', () => {
    const msg: Message = { type: 'literal', text: 'Hello' };
    expect(generateIcuMessageFormat(msg)) //
      .toMatchInlineSnapshot('"Hello"');
  });

  it('should generate composite messages', () => {
    const msg: Message = {
      type: 'composite',
      accessor: null as never,
      children: {
        0: { type: 'literal', text: 'Hello' },
        1: { type: 'literal', text: ' world' },
      },
      comments: [],
      references: [],
      context: undefined,
    };
    expect(generateIcuMessageFormat(msg)) //
      .toMatchInlineSnapshot('"Hello world"');
  });

  it('should generate argument messages', () => {
    const msg: Message = {
      type: 'argument',
      expression: null as never,
      identifier: 'name',
    };
    expect(generateIcuMessageFormat(msg)) //
      .toMatchInlineSnapshot('"{name}"');
  });

  it('should generate element messages', () => {
    const msg: Message = {
      type: 'element',
      expression: null as never,
      identifier: '0',
      children: {
        0: { type: 'literal', text: 'bold' },
      },
    };
    expect(generateIcuMessageFormat(msg)) //
      .toMatchInlineSnapshot('"<0>bold</0>"');
  });

  it('should generate choice messages with numeric keys as `=n`', () => {
    const msg: Message = {
      type: 'choice',
      kind: 'plural',
      expression: null as never,
      identifier: 'count',
      children: {
        0: { type: 'literal', text: 'none' },
        one: { type: 'literal', text: 'one' },
        other: { type: 'literal', text: 'many' },
      },
    };
    expect(generateIcuMessageFormat(msg)) //
      .toMatchInlineSnapshot(`
        "{count, plural,
          =0 {none}
          one {one}
          other {many}
        }"
      `);
  });

  it('should generate choice messages with ordinal kind', () => {
    const msg: Message = {
      type: 'choice',
      kind: 'ordinal',
      expression: null as never,
      identifier: 'place',
      children: {
        one: { type: 'literal', text: 'first' },
        two: { type: 'literal', text: 'second' },
        other: { type: 'literal', text: 'other' },
      },
    };
    expect(generateIcuMessageFormat(msg)) //
      .toMatchInlineSnapshot(`
        "{place, selectordinal,
          one {first}
          two {second}
          other {other}
        }"
      `);
  });

  it('should normalise jsx related whitespace', () => {
    const msg: Message = {
      type: 'composite',
      accessor: null as never,
      children: {
        0: { type: 'literal', text: '\n  Hello, ' },
        1: { type: 'argument', expression: null as never, identifier: 'name' },
        2: { type: 'literal', text: '!\n' },
      },
      comments: [],
      references: [],
      context: undefined,
    };
    expect(generateIcuMessageFormat(msg)) //
      .toMatchInlineSnapshot('"Hello, {name}!"');
  });
});
