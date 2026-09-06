import { inspect } from 'node:util';
import { describe, expect, it } from 'vitest';
import { createCatalogue, createView, type View } from './index.js';

type Locale = 'en' | 'fr';

/**
 * Messages in the shape the CLI compiles them into: one node per id, reading
 * each value from behind the underscore the transform writes it with.
 *
 * What those nodes are compiled from is the CLI's business, and how they are
 * evaluated is `compileMessage`'s, each covered by its own tests.
 */
const messages = {
  en: {
    greeting: 'Hello',
    items: ['?', ['=', ['v', '_count'], 1], '1 item', ['c', ['v', '_count'], ' items']],
    named: ['c', 'Hello, ', ['v', '_name']],
    identified: ['c', 'Order ', ['v', '_id']],
    underscored: ['c', 'Total ', ['v', '__total']],
  },
  fr: {
    greeting: 'Bonjour',
    items: ['?', ['=', ['v', '_count'], 1], '1 article', ['c', ['v', '_count'], ' articles']],
  },
} satisfies Record<Locale, View.Messages>;

function make() {
  return createCatalogue(messages);
}

describe('createView', () => {
  it('builds a view over a bare record of messages, with no catalogue', () => {
    const say = createView('en', messages.en);
    expect(say.locale).toBe('en');
    expect(say.call({ id: 'greeting' })).toBe('Hello');
  });

  it('is what a catalogue memoises, so a direct view is a second value', () => {
    // Same messages, same locale, but built outside the catalogue: views are
    // memoised per catalogue rather than interned globally
    expect(createView('en', messages.en)).not.toBe(make().locale('en'));
  });
});

describe('View#call', () => {
  const say = make().locale('en');

  it('formats a message for the locale the view is bound to', () => {
    expect(say.call({ id: 'greeting' })).toBe('Hello');
    expect(make().locale('fr').call({ id: 'greeting' })).toBe('Bonjour');
  });

  it('formats a message with placeholders', () => {
    expect(say.call({ id: 'items', _count: 1 })).toBe('1 item');
    expect(say.call({ id: 'items', _count: 5 })).toBe('5 items');
  });

  it('names the locale when the message id is not found', () => {
    expect(() => say.call({ id: 'missing' })).toThrow("No message for missing in locale 'en'");
  });

  it('hands the descriptor over whole, values still behind their underscore', () => {
    expect(say.call({ id: 'named', _name: 'Ada' })).toBe('Hello, Ada');
    expect(say.call({ id: 'underscored', __total: '9' })).toBe('Total 9');
  });

  it('formats a value named after the descriptor id', () => {
    // The lookup uses the id; `{id}` in the message is filled from `_id`
    expect(say.call({ id: 'identified', _id: '42' })).toBe('Order 42');
  });

  it('does not expose the message id as a value', () => {
    expect(say.call({ id: 'identified' })).not.toContain('identified');
  });
});

describe('View immutability', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(make().locale('en'))).toBe(true);
  });

  it('copies the messages it was given, so the caller cannot change them later', () => {
    const source: View.Messages = { greeting: 'Hello' };
    const say = createView('en', source);
    source.greeting = 'Goodbye';
    expect(say.call({ id: 'greeting' })).toBe('Hello');
  });

  it('freezes its messages', () => {
    expect(Object.isFrozen(createView('en', { greeting: 'Hello' }).messages)).toBe(true);
  });
});

describe('View inspect', () => {
  it('names the locale it is bound to', () => {
    expect(inspect(make().locale('en'))).toBe("View<'en'> {}");
  });
});

describe('View macros', () => {
  const say = make().locale('en');

  it('throws when the message macro itself survives to runtime', () => {
    expect(() => (say as unknown as (s: TemplateStringsArray) => string)`Hello`).toThrow(
      "'say' is a macro and must be used with the relevant saykit plugin",
    );
  });

  it.each([
    ['plural', () => say.plural(1, { other: '#' })],
    ['ordinal', () => say.ordinal(1, { other: '#' })],
    ['select', () => say.select('a', { other: 'b' })],
    ['number', () => say.number(1)],
    ['date', () => say.date(new Date())],
    ['time', () => say.time(new Date())],
  ])('throws for %s', (name, call) => {
    expect(call).toThrow(
      `'say.${name}' is a macro and must be used with the relevant saykit plugin`,
    );
  });
});
