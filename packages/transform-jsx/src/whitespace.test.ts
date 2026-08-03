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
 * Prettier wraps JSX at the print width, so a translatable line routinely ends
 * with a word and continues with an element on the next line. The line break is
 * the only thing separating them, and it has to keep meaning "space" — dropping
 * it runs the words together and, because ids are content hashes, silently
 * orphans every existing translation for the message.
 *
 * Each case below is lifted from a real example app, named by where it lives.
 * They exist because they are the shapes that regressed in #63 while the whole
 * suite stayed green.
 */
describe('whitespace across a line break', () => {
  it('joins text to an element on the next line', () => {
    // examples/react/src/components/board.tsx
    expect(
      extract(`<Say>
        Nothing here. <a href="#new">Add a task</a> or drag one across from
        <strong>To do</strong>.
      </Say>`),
    ).toBe('Nothing here. <0>Add a task</0> or drag one across from <1>To do</1>.');
  });

  it('joins text between two elements that each start a line', () => {
    // examples/expo/src/habit-card.tsx
    expect(
      extract(`<Say>
        <Text style={s}>{a}</Text> of
        <Text style={s}>{b}</Text> this week
      </Say>`),
    ).toBe('<0>{a}</0> of <1>{b}</1> this week');
  });

  it('joins text to a choice element on both sides', () => {
    // examples/tanstack-start/src/routes/{-$locale}/index.tsx
    expect(
      extract(`<Say>
        their
        <Say.Ordinal _={n} one="#st" two="#nd" few="#rd" other="#th" />
        time on this stage
      </Say>`),
    ).toBe(`their {n, selectordinal,
  one {#st}
  two {#nd}
  few {#rd}
  other {#th}
} time on this stage`);
  });

  it('joins text to two consecutive choice elements', () => {
    // examples/tanstack-start/src/routes/{-$locale}/index.tsx
    expect(
      extract(`<Say>
        The full program —
        <Say.Plural _={s} one="# session" other="# sessions" />, including
        <Say.Plural _={w} one="# workshop" other="# workshops" />.
      </Say>`),
    ).toBe(`The full program — {s, plural,
  one {# session}
  other {# sessions}
}, including {w, plural,
  one {# workshop}
  other {# workshops}
}.`);
  });
});

describe('whitespace on a single line', () => {
  it('keeps single spaces around an element', () => {
    expect(extract('<Say>Hello <strong>brave</strong> world!</Say>')).toBe(
      'Hello <0>brave</0> world!',
    );
  });

  it('collapses a run of spaces to one', () => {
    expect(extract('<Say>Hello   <strong>brave</strong>   world!</Say>')).toBe(
      'Hello <0>brave</0> world!',
    );
  });

  it('keeps no space where the source has none', () => {
    expect(extract('<Say>(<strong>brave</strong>)</Say>')).toBe('(<0>brave</0>)');
  });
});

describe('whitespace at the container edges', () => {
  it('trims the indentation a multiline container introduces', () => {
    expect(
      extract(`<Say>
        Hello, world!
      </Say>`),
    ).toBe('Hello, world!');
  });

  it('joins wrapped lines of plain text with a single space', () => {
    expect(
      extract(`<Say>
        Hello,
        world!
      </Say>`),
    ).toBe('Hello, world!');
  });

  it('trims around a leading and trailing element', () => {
    expect(
      extract(`<Say>
        <strong>Hello</strong>, world
      </Say>`),
    ).toBe('<0>Hello</0>, world');
  });
});

/**
 * The counterpart to the block above: a line break usually means a space, but
 * punctuation belongs tight against what precedes it. A formatter wrapping long
 * JSX strands punctuation at the start of a line routinely, and a space in
 * front of it would ship to every locale.
 */
describe('punctuation at the start of a line', () => {
  it('takes no space before a full stop left on its own line', () => {
    expect(
      extract(`<Say>
        Kiai Security — only authorize apps you trust. Report malicious
        integrations in
        <a href="https://discord.gg/example">our support server</a>
        .
      </Say>`),
    ).toBe(
      'Kiai Security — only authorize apps you trust. Report malicious integrations in <0>our support server</0>.',
    );
  });

  it('takes no space before a clause that opens with a comma', () => {
    expect(
      extract(`<Say>
        Signed,
        <strong>the team</strong>
        , with thanks
      </Say>`),
    ).toBe('Signed, <0>the team</0>, with thanks');
  });

  it('keeps a space the author wrote on the same line', () => {
    // Only an implicit line break is collapsed away; this space is deliberate.
    expect(extract('<Say>Ready <strong>set</strong> ?</Say>')).toBe('Ready <0>set</0> ?');
  });

  it('keeps a space before an opening bracket on the next line', () => {
    expect(
      extract(`<Say>
        See <a href="/d">the docs</a>
        (they are short)
      </Say>`),
    ).toBe('See <0>the docs</0> (they are short)');
  });
});
