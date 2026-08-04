import { describe, expect, it } from 'vitest';
import createJsxTransformer from './index.js';

const transformer = createJsxTransformer();

// Extraction is the level these regressions are actually observed at: the
// strings asserted below are byte-for-byte the msgids and catalogue values that
// land in `examples/*/src/locales/*`. A whitespace change that survives the
// parser but corrupts a catalogue has to fail here.
function extract(jsx: string) {
  return transformer.extract(`const x = ${jsx};`, 'file.tsx')[0]?.message;
}

/**
 * The whole rule, and the only one worth remembering: a message extracts as the
 * text JSX renders. A line break and the indentation around it are how the
 * source is laid out, not part of the sentence, so they never reach a
 * catalogue — whitespace that has to survive a break is written as `{' '}`.
 *
 * Every case below is what React itself would put on the page for the same JSX.
 * Where the two could differ, this file is wrong.
 */
describe('a line break between two children', () => {
  it('leaves nothing between text and an element on the next line', () => {
    expect(
      extract(`<Say>
        <span>{days}</span>
        d
      </Say>`),
    ).toBe('<0>{days}</0>d');
  });

  it('leaves nothing between two elements on their own lines', () => {
    expect(
      extract(`<Say>
        <strong>1</strong>
        <em>2</em>
      </Say>`),
    ).toBe('<0>1</0><1>2</1>');
  });

  it('leaves nothing before punctuation stranded on its own line', () => {
    expect(
      extract(`<Say>
        Read <a href="/d">the docs</a>
        .
      </Say>`),
    ).toBe('Read <0>the docs</0>.');
  });

  it('leaves nothing before a choice element on the next line', () => {
    expect(
      extract(`<Say>
        their
        <Say.Ordinal _={n} one="#st" other="#th" />
      </Say>`),
    ).toBe(`their{n, selectordinal,
  one {#st}
  other {#th}
}`);
  });
});

/**
 * The counterpart: a break between two runs of text is the only thing that was
 * separating the words, so it rejoins as the single space it renders as.
 */
describe('a line break inside a run of text', () => {
  it('joins wrapped lines with a single space', () => {
    expect(
      extract(`<Say>
        Hello,
        world!
      </Say>`),
    ).toBe('Hello, world!');
  });

  it('joins lines around a blank line with a single space', () => {
    expect(
      extract(`<Say>
        Hello,

        world!
      </Say>`),
    ).toBe('Hello, world!');
  });

  it('trims the indentation a multiline container introduces', () => {
    expect(
      extract(`<Say>
        Hello, world!
      </Say>`),
    ).toBe('Hello, world!');
  });

  it('reads a tab as a space', () => {
    expect(extract('<Say>\n\t\tHello,\n\t\tworld!\n\t</Say>')).toBe('Hello, world!');
  });
});

/**
 * Inside a line there is no break to attribute anything to, so every space is
 * one the author typed and every one of them renders.
 */
describe('whitespace written inside a line', () => {
  it('keeps single spaces around an element', () => {
    expect(extract('<Say>Hello <strong>brave</strong> world!</Say>')).toBe(
      'Hello <0>brave</0> world!',
    );
  });

  it('keeps a run of spaces as written', () => {
    expect(extract('<Say>Hello   <strong>brave</strong>   world!</Say>')).toBe(
      'Hello   <0>brave</0>   world!',
    );
  });

  it('keeps no space where the source has none', () => {
    expect(extract('<Say>(<strong>brave</strong>)</Say>')).toBe('(<0>brave</0>)');
  });

  it('keeps a space against the edge of the line the break interrupts', () => {
    expect(
      extract(`<Say>
        See <a href="/d">the docs</a> and
        <a href="/x">the examples</a> too
      </Say>`),
    ).toBe('See <0>the docs</0> and<1>the examples</1> too');
  });
});

/**
 * How a space survives a break. Prettier writes `{' '}` itself when it wraps a
 * line that ends in one, so this is the shape the formatter already produces —
 * it extracts as the space it renders as, rather than as a placeholder no
 * translator can see or move.
 */
describe('whitespace written as an expression', () => {
  it("extracts {' '} as a space", () => {
    expect(
      extract(`<Say>
        Nothing here. <a href="#new">Add a task</a> or drag one across from{' '}
        <strong>To do</strong>.
      </Say>`),
    ).toBe('Nothing here. <0>Add a task</0> or drag one across from <1>To do</1>.');
  });

  it("extracts {'\\n'} as a line break", () => {
    expect(extract(`<Say>Hello,{'\\n'}world!</Say>`)).toBe('Hello,\nworld!');
  });

  it('extracts a template literal with nothing interpolated', () => {
    expect(extract('<Say>Hello,{` `}world!</Say>')).toBe('Hello, world!');
  });

  it('extracts any other literal string as the text it renders as', () => {
    expect(extract(`<Say>Hello, {'world'}!</Say>`)).toBe('Hello, world!');
  });

  // A number written into a sentence is content a translator should be able to
  // read and move, not a value the catalogue asks the caller for.
  it('extracts a literal number as the text it renders as', () => {
    expect(extract('<Say>Top {10} results</Say>')).toBe('Top 10 results');
  });

  it('folds the surrounding text into a single run', () => {
    expect(extract(`<Say>Hello,{' '}world!</Say>`)).toBe('Hello, world!');
  });

  it('carries a space between two choice elements', () => {
    expect(
      extract(`<Say>
        <Say.Plural _={s} one="# session" other="# sessions" />{' '}
        ·{' '}
        <Say.Plural _={w} one="# workshop" other="# workshops" />
      </Say>`),
    ).toBe(`{s, plural,
  one {# session}
  other {# sessions}
} · {w, plural,
  one {# workshop}
  other {# workshops}
}`);
  });

  it('leaves nothing behind for an empty string', () => {
    expect(extract(`<Say>Hello,{''} world!</Say>`)).toBe('Hello, world!');
  });

  it('still extracts an interpolated value as a placeholder', () => {
    expect(extract('<Say>Hello, {name}!</Say>')).toBe('Hello, {name}!');
  });
});
