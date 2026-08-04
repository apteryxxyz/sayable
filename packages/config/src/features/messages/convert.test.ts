import { describe, expect, it } from 'vitest';
import { convertMessageToIcu } from './convert.js';
import {
  ArgumentMessage,
  ChoiceMessage,
  CompositeMessage,
  ElementMessage,
  LiteralMessage,
} from './types.js';

const dummy = undefined as any;

describe('convertMessageToIcu', () => {
  it('should generate literal messages', () => {
    const message = new LiteralMessage('Hello');
    expect(convertMessageToIcu(message)) //
      .toMatchInlineSnapshot('"Hello"');
  });

  /**
   * A brace in literal text is text. Left as it is, ICU reads it as an
   * argument the catalogue never declared — `Use {name} here` stops being a
   * sentence about braces and starts being a sentence with a hole in it.
   *
   * The round trip is what these assert against: each escaped string below is
   * fed back through the runtime formatter in `packages/integration`, and has
   * to come out as the text it started as.
   */
  describe('escaping literal text', () => {
    it.each([
      ['a brace', 'Use {name} here', `Use '{'name'}' here`],
      ['a run of braces', 'a {{ b }} c', `a '{{' b '}}' c`],
      // Doubled only where a quote could start. In `don't` the apostrophe is
      // followed by a letter, so ICU already reads it as an apostrophe.
      ['an apostrophe in front of a brace', "'{", `'''{'`],
      ['an apostrophe in front of an apostrophe', "it''s", `it'''s`],
      ['an apostrophe in front of neither', "don't {x}", `don't '{'x'}'`],
      ['an apostrophe in front of nothing at all', "the '80s'", `the '80s'`],
      // Otherwise it quotes the `#`, which is how ICU spells a literal one —
      // an escape nobody wrote and the sentence does not mean.
      ['an apostrophe in front of a hash', "it's '#1", `it's ''#1`],
    ])('escapes %s', (_, text, expected) => {
      expect(convertMessageToIcu(new LiteralMessage(text))).toBe(expected);
    });

    // Doubling every apostrophe would be valid ICU and would rewrite the id of
    // every message that has ever contained one, for nothing.
    it('leaves an ordinary apostrophe alone', () => {
      expect(convertMessageToIcu(new LiteralMessage("It's a test"))).toBe("It's a test");
    });

    /**
     * The character a literal runs into is not always one of its own. An
     * apostrophe at the end of a literal sits against whatever the message puts
     * next, and quoting there steals syntax that belongs to a sibling.
     */
    it('doubles an apostrophe that runs into a placeholder', () => {
      const message = new CompositeMessage(
        {},
        [],
        [],
        [
          new LiteralMessage("Click '"),
          new ArgumentMessage('name', dummy),
          new LiteralMessage("'"),
        ],
        dummy,
      );
      expect(convertMessageToIcu(message)).toBe(`Click ''{name}'`);
    });

    it('doubles an apostrophe that runs into the end of a branch', () => {
      const message = new ChoiceMessage(
        'plural',
        'n',
        [{ identifier: 'other', value: new LiteralMessage("the boys'") }],
        dummy,
      );
      expect(convertMessageToIcu(message)).toContain("other {the boys''}");
    });

    // Nothing can be quoted at the end of the string, so the id of a message
    // that simply ends in an apostrophe does not move.
    it('leaves an apostrophe at the end of a message alone', () => {
      expect(convertMessageToIcu(new LiteralMessage("the boys'"))).toBe("the boys'");
    });

    // Inside a plural this is the number being formatted, which is the whole
    // reason to write one.
    it('leaves a hash alone', () => {
      expect(convertMessageToIcu(new LiteralMessage('issue #1'))).toBe('issue #1');
    });
  });

  it('should generate argument messages', () => {
    const message = new ArgumentMessage('name', dummy);
    expect(convertMessageToIcu(message)) //
      .toMatchInlineSnapshot('"{name}"');
  });

  it('should generate argument messages with a format type', () => {
    const message = new ArgumentMessage('count', dummy, { type: 'number' });
    expect(convertMessageToIcu(message)) //
      .toMatchInlineSnapshot('"{count, number}"');
  });

  it('should generate argument messages with a format type and style', () => {
    const message = new ArgumentMessage('when', dummy, { type: 'date', style: 'medium' });
    expect(convertMessageToIcu(message)) //
      .toMatchInlineSnapshot('"{when, date, medium}"');
  });

  it('should omit an empty style rather than emit a trailing comma', () => {
    const message = new ArgumentMessage('n', dummy, { type: 'number', style: undefined });
    expect(convertMessageToIcu(message)) //
      .toMatchInlineSnapshot('"{n, number}"');
  });

  it('should generate element messages', () => {
    const message = new ElementMessage('0', [new LiteralMessage('Hello world!')], dummy);
    expect(convertMessageToIcu(message)) //
      .toMatchInlineSnapshot('"<0>Hello world!</0>"');
  });

  it('should generate childless element messages as self-closing', () => {
    const message = new ElementMessage('icon', [], dummy);
    expect(convertMessageToIcu(message)) //
      .toMatchInlineSnapshot('"<icon/>"');
  });

  it('should keep element messages paired when a child renders to nothing', () => {
    const message = new ElementMessage(
      'bold',
      [new CompositeMessage({}, [], [], [], dummy)],
      dummy,
    );
    expect(convertMessageToIcu(message)) //
      .toMatchInlineSnapshot('"<bold></bold>"');
  });

  it('should generate choice messages with numeric identifiers as `=n`', () => {
    const message = new ChoiceMessage(
      'plural',
      'count',
      [
        { identifier: '0', value: new LiteralMessage('none') },
        { identifier: 'one', value: new LiteralMessage('one') },
        { identifier: 'other', value: new LiteralMessage('many') },
      ],
      dummy,
    );
    expect(convertMessageToIcu(message)).toMatchInlineSnapshot(`
      "{count, plural,
        =0 {none}
        one {one}
        other {many}
      }"
    `);
  });

  it('should generate choice messages with an offset', () => {
    const message = new ChoiceMessage(
      'plural',
      'count',
      [
        { identifier: 'one', value: new LiteralMessage('you and # other') },
        { identifier: 'other', value: new LiteralMessage('you and # others') },
      ],
      dummy,
      1,
    );
    expect(convertMessageToIcu(message)).toMatchInlineSnapshot(`
      "{count, plural, offset:1
        one {you and # other}
        other {you and # others}
      }"
    `);
  });

  it('should generate an offset of zero rather than treat it as absent', () => {
    const message = new ChoiceMessage(
      'plural',
      'count',
      [{ identifier: 'other', value: new LiteralMessage('#') }],
      dummy,
      0,
    );
    expect(convertMessageToIcu(message)).toMatchInlineSnapshot(`
      "{count, plural, offset:0
        other {#}
      }"
    `);
  });

  // `select` matches literal strings and has no number to offset, so emitting
  // one would be invalid ICU rather than a harmless no-op.
  it('should drop an offset on a select', () => {
    const message = new ChoiceMessage(
      'select',
      'kind',
      [{ identifier: 'other', value: new LiteralMessage('x') }],
      dummy,
      1,
    );
    expect(convertMessageToIcu(message)).toMatchInlineSnapshot(`
      "{kind, select,
        other {x}
      }"
    `);
  });

  it('should generate choice messages with ordinal kind', () => {
    const message = new ChoiceMessage(
      'ordinal',
      'place',
      [
        { identifier: '1', value: new LiteralMessage('first') },
        { identifier: '2', value: new LiteralMessage('second') },
        { identifier: '3', value: new LiteralMessage('third') },
        { identifier: 'other', value: new LiteralMessage('other') },
      ],
      dummy,
    );
    expect(convertMessageToIcu(message)).toMatchInlineSnapshot(`
      "{place, selectordinal,
        =1 {first}
        =2 {second}
        =3 {third}
        other {other}
      }"
    `);
  });

  // A numeric key stays bare under `select`, which matches its cases as literal
  // strings — `=0` there is a parse error, not an exact value.
  it('should generate select messages with numeric identifiers bare', () => {
    const message = new ChoiceMessage(
      'select',
      'tier',
      [
        { identifier: '0', value: new LiteralMessage('Free') },
        { identifier: '1', value: new LiteralMessage('Pro') },
        { identifier: 'other', value: new LiteralMessage('Unknown') },
      ],
      dummy,
    );
    expect(convertMessageToIcu(message)).toMatchInlineSnapshot(`
      "{tier, select,
        0 {Free}
        1 {Pro}
        other {Unknown}
      }"
    `);
  });

  it('should generate choice messages with select kind', () => {
    const message = new ChoiceMessage(
      'select',
      'gender',
      [
        { identifier: 'male', value: new LiteralMessage('He') },
        { identifier: 'female', value: new LiteralMessage('She') },
        { identifier: 'other', value: new LiteralMessage('They') },
      ],
      dummy,
    );
    expect(convertMessageToIcu(message)).toMatchInlineSnapshot(`
      "{gender, select,
        male {He}
        female {She}
        other {They}
      }"
    `);
  });

  it('should generate composite messages', () => {
    const message = new CompositeMessage(
      {},
      [],
      [],
      [new LiteralMessage('Hello, '), new ArgumentMessage('name', dummy), new LiteralMessage('!')],
      dummy,
    );
    expect(convertMessageToIcu(message)) //
      .toMatchInlineSnapshot('"Hello, {name}!"');
  });

  // Collapsing a message's own indentation is the JSX parser's job, and it
  // does it the way JSX does. By the time text arrives here it is the text the
  // message means, edges included — a space at either end is as deliberate as
  // one in the middle, and `{' '}` is how JSX asks for it.
  it('keeps whitespace at the edges of a message', () => {
    const message = new CompositeMessage(
      {},
      [],
      [],
      [
        new LiteralMessage(' Hello, '),
        new ArgumentMessage('name', dummy),
        new LiteralMessage('! '),
      ],
      dummy,
    );
    expect(convertMessageToIcu(message)) //
      .toMatchInlineSnapshot(`" Hello, {name}! "`);
  });

  it('throws for an unknown message type', () => {
    expect(() => convertMessageToIcu({} as never)).toThrow('Unknown message type');
  });
});
