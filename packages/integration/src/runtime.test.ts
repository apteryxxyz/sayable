import { inspect } from 'node:util';
import { describe, expect, it, vi } from 'vitest';
import { Say } from './runtime.js';

type Locale = 'en' | 'fr' | 'de';

const messages = {
  en: {
    greeting: 'Hello',
    items: '{count, plural, one {# item} other {# items}}',
    named: 'Hello, {name}',
    identified: 'Order {id}',
    underscored: 'Total {_total}',
  },
  fr: { greeting: 'Bonjour', items: '{count, plural, one {# article} other {# articles}}' },
} satisfies Partial<Record<Locale, Say.Messages>>;

/**
 * Build options with partial (or empty) messages. The public `Options` type
 * requires a complete locale record or a loader; several tests deliberately
 * exercise the looser runtime behaviour, so they opt out of that constraint.
 */
const opts = (o: {
  locales: Locale[];
  messages?: Partial<Record<Locale, Say.Messages>>;
  loader?: Say.Loader<Locale>;
}) => o as Say.Options<Locale, Say.Loader<Locale> | undefined>;

/**
 * Drop the bidi isolation marks the formatter wraps substituted values in, so
 * an assertion can read as the sentence a user sees.
 */
function plain(formatted: string) {
  return formatted.replaceAll(/[⁨⁩]/g, '');
}

function make(active?: Locale) {
  const say = new Say<Locale>(opts({ locales: ['en', 'fr', 'de'], messages }));
  if (active) say.activate(active);
  return say;
}

describe('Say constructor', () => {
  it('assigns messages passed to the constructor', () => {
    const say = make('en');
    expect(say.messages).toEqual(messages.en);
  });

  it('works without messages when a loader is provided', () => {
    const loader = vi.fn((locale: Locale) => messages[locale as 'en' | 'fr'] ?? {});
    const say = new Say<Locale>({ locales: ['en'], loader });
    expect(say.locales).toEqual(['en']);
    expect(loader).not.toHaveBeenCalled();
  });
});

describe('Say.locale getter', () => {
  it('throws when no locale is active', () => {
    expect(() => make().locale).toThrow('No active locale');
  });

  it('returns the active locale', () => {
    expect(make('fr').locale).toBe('fr');
  });
});

describe('Say.messages getter', () => {
  // The active-locale case is covered by the constructor test above.
  it('throws when no locale is active', () => {
    expect(() => make().messages).toThrow('No active locale');
  });
});

describe('Say.locales getter', () => {
  it('returns all locales', () => {
    expect(make().locales).toEqual(['en', 'fr', 'de']);
  });
});

describe('Say.load', () => {
  it('throws when called on a frozen instance', () => {
    const frozen = make('en').freeze();
    expect(() => (frozen as unknown as Say<Locale>).load()).toThrow(
      'Cannot load messages on a frozen Say',
    );
  });

  it('loads all locales when none are specified', () => {
    const loader = vi.fn((locale: Locale) => ({ greeting: `hi-${locale}` }));
    const say = new Say<Locale>({ locales: ['de'], loader });
    const result = say.load();
    expect(result).toBe(say);
    expect(loader).toHaveBeenCalledWith('de');
    expect(say.activate('de').messages).toEqual({ greeting: 'hi-de' });
  });

  it('skips locales that already have messages', () => {
    const loader = vi.fn(() => ({ greeting: 'x' }));
    const say = new Say<Locale>({ locales: ['en', 'fr'], messages, loader });
    say.load('en', 'fr');
    expect(loader).not.toHaveBeenCalled();
  });

  it('throws when no loader is provided', () => {
    const say = new Say<Locale>(opts({ locales: ['de'], messages: {} }));
    expect(() => say.load('de')).toThrow('No loader provided, cannot load messages');
  });

  it('assigns synchronously returned messages', () => {
    const say = new Say<Locale>({ locales: ['de'], loader: () => ({ greeting: 'Hallo' }) });
    const result = say.load('de');
    expect(result).toBe(say);
    expect(say.activate('de').messages).toEqual({ greeting: 'Hallo' });
  });

  it('returns a promise and assigns when the loader is async', async () => {
    const loader = vi.fn(async (locale: Locale) => ({ greeting: `async-${locale}` }));
    const say = new Say<Locale>({ locales: ['de'], loader });
    const result = say.load('de');
    expect(result).toBeInstanceOf(Promise);
    const resolved = await result;
    expect(resolved).toBe(say);
    expect(say.activate('de').messages).toEqual({ greeting: 'async-de' });
  });
});

describe('Say.assign', () => {
  it('throws when called on a frozen instance', () => {
    const frozen = make('en').freeze();
    expect(() => (frozen as unknown as Say<Locale>).assign('en', {})).toThrow(
      'Cannot assign messages on a frozen Say',
    );
  });

  it('assigns messages to a single locale', () => {
    const say = new Say<Locale>(opts({ locales: ['de'], messages: {} }));
    say.assign('de', { greeting: 'Hallo' });
    expect(say.activate('de').messages).toEqual({ greeting: 'Hallo' });
  });

  it('bulk assigns messages from a record', () => {
    const say = new Say<Locale>(opts({ locales: ['en', 'fr'], messages: {} }));
    say.assign(messages);
    expect(say.activate('fr').messages).toEqual(messages.fr);
  });

  it('returns this', () => {
    const say = new Say<Locale>(opts({ locales: ['de'], messages: {} }));
    expect(say.assign('de', {})).toBe(say);
  });
});

describe('Say.activate', () => {
  it('throws when called on a frozen instance', () => {
    const frozen = make('en').freeze();
    expect(() => (frozen as unknown as Say<Locale>).activate('fr')).toThrow(
      'Cannot activate locale on a frozen Say',
    );
  });

  it('throws when there are no messages for the locale', () => {
    expect(() => make().activate('de')).toThrow('No messages loaded for locale');
  });

  it('sets the active locale and returns this', () => {
    const say = make();
    expect(say.activate('en')).toBe(say);
    expect(say.locale).toBe('en');
  });
});

describe('Say.clone', () => {
  it('copies locales, messages and active locale', () => {
    const say = make('fr');
    const copy = say.clone();
    expect(copy).toBeInstanceOf(Say);
    expect(copy.locales).toEqual(['en', 'fr', 'de']);
    expect(copy.locale).toBe('fr');
    expect(copy.messages).toEqual(messages.fr);
    // Reactivating the clone does not affect the original.
    copy.activate('en');
    expect(copy.locale).toBe('en');
    expect(say.locale).toBe('fr');
  });

  it('clones an instance with no active locale', () => {
    const copy = make().clone();
    expect(() => copy.locale).toThrow('No active locale');
  });
});

describe('Say.freeze', () => {
  it('makes the instance immutable', () => {
    const frozen = make('en').freeze();
    expect(Object.isFrozen(frozen)).toBe(true);
  });
});

describe('Say iteration', () => {
  it('yields a frozen, activated clone for each locale', () => {
    const say = new Say<Locale>(opts({ locales: ['en', 'fr'], messages }));
    const entries = [...say];
    expect(entries.map(([, locale]) => locale)).toEqual(['en', 'fr']);
    for (const [instance, locale] of entries) {
      expect(Object.isFrozen(instance)).toBe(true);
      expect(instance.locale).toBe(locale);
    }
  });
});

describe('Say.match', () => {
  // Locales are ['en', 'fr', 'de'], so 'en' is the first-locale fallback.
  it.each([
    ['no guesses are given', [], 'en'],
    ['guesses are empty arrays', [[]], 'en'],
    ['a guess matches exactly', ['fr'], 'fr'],
    ['a guess is nested in an array', [['zz', 'fr']], 'fr'],
    ['a guess matches on language prefix', ['fr-CA'], 'fr'],
    ['a guess has an empty prefix', ['', 'de'], 'de'],
    ['nothing matches', ['zz', 'xx-YY'], 'en'],
  ])('resolves the locale when %s', (_, guesses, expected) => {
    expect(make().match(...(guesses as Parameters<ReturnType<typeof make>['match']>))).toBe(
      expected,
    );
  });
});

describe('Say.call', () => {
  it('formats a message for the active locale', () => {
    const say = make('en');
    expect(say.call({ id: 'greeting' })).toBe('Hello');
  });

  it('formats a message with placeholders', () => {
    const say = make('en');
    expect(say.call({ id: 'items', count: 1 })).toBe('1 item');
    expect(say.call({ id: 'items', count: 5 })).toBe('5 items');
  });

  it('caches the compiled format across calls', () => {
    const say = make('fr');
    expect(say.call({ id: 'items', count: 1 })).toBe('1 article');
    // Second call hits the cached format.
    expect(say.call({ id: 'items', count: 2 })).toBe('2 articles');
  });

  it('throws when the message id is not found', () => {
    expect(() => make('en').call({ id: 'missing' })).toThrow('Message for missing is not a string');
  });

  it('strips the underscore the transform compiles values behind', () => {
    expect(plain(make('en').call({ id: 'named', _name: 'Ada' }))).toBe('Hello, Ada');
  });

  it('formats keys written without one, so a hand-written call still works', () => {
    expect(plain(make('en').call({ id: 'named', name: 'Ada' }))).toBe('Hello, Ada');
  });

  it('formats a value named after the descriptor id', () => {
    // The lookup still uses the id; the value only fills `{id}` in the message.
    expect(plain(make('en').call({ id: 'identified', _id: '42' }))).toBe('Order 42');
  });

  it('does not expose the message id as a value', () => {
    // `{id}` is left unresolved rather than filled with the message's own id.
    expect(plain(make('en').call({ id: 'identified' }))).not.toContain('identified');
  });

  it('strips exactly one underscore, so a name that starts with one survives', () => {
    expect(plain(make('en').call({ id: 'underscored', __total: '9' }))).toBe('Total 9');
  });

  it('treats a value named `__proto__` as a value, not as a prototype', () => {
    // Assigning the stripped key would write through to `Object.prototype`
    // rather than naming a placeholder, so the values are built from own
    // entries instead.
    const descriptor = { id: 'named', _name: 'Ada' };
    Object.defineProperty(descriptor, '___proto__', {
      value: { polluted: true },
      enumerable: true,
    });
    expect(plain(make('en').call(descriptor))).toBe('Hello, Ada');
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it('ignores keys a descriptor only inherits', () => {
    const descriptor = Object.assign(Object.create({ _name: 'Ghost' }), { id: 'named' });
    expect(plain(make('en').call(descriptor))).not.toContain('Ghost');
  });
});

describe('Say inspect', () => {
  it('includes the active locale when one is set', () => {
    expect(inspect(make('en'))).toBe("Say<'en'> {}");
  });

  it('omits the locale when none is active', () => {
    expect(inspect(make())).toBe('Say {}');
  });
});

describe('Say macros', () => {
  const say = make('en');

  it.each([
    ['plural', () => say.plural(1, { other: '#' })],
    ['ordinal', () => say.ordinal(1, { other: '#' })],
    ['select', () => say.select('a', { other: 'b' })],
    ['number', () => say.number(1)],
    ['date', () => say.date(new Date())],
    ['time', () => say.time(new Date())],
  ])('throws for %s', (name, call) => {
    expect(call).toThrow(
      `'Say#${name}' is a macro and must be used with the relevant saykit plugin`,
    );
  });
});

// The macros exist to author these strings, so what matters is that the ICU
// they extract to is ICU the runtime formatter actually honours. Every style
// the parser accepts is exercised here, against the formatter we ship.
describe('formatted arguments', () => {
  // Built in local time, at midday, so the calendar date is the same one in
  // every timezone the suite might run in.
  const when = new Date(2020, 0, 2, 12, 4, 5);

  function format(message: string, values: Record<string, unknown>) {
    return new Say({ locales: ['en-US'], messages: { 'en-US': { m: message } } })
      .activate('en-US')
      .call({ id: 'm', ...values });
  }

  it.each([
    ['{n, number}', { n: 1234.5 }, '1,234.5'],
    ['{n, number, integer}', { n: 1234.5 }, '1,235'],
    ['{n, number, percent}', { n: 0.25 }, '25%'],
    ['{n, number, #,##0.00}', { n: 1234.5 }, '1,234.50'],
  ])('formats %s', (message, values, expected) => {
    expect(format(message, values)).toBe(expected);
  });

  it.each([
    ['{d, date}', 'Jan 2, 2020'],
    ['{d, date, short}', '1/2/2020'],
    ['{d, date, medium}', 'Jan 2, 2020'],
    ['{d, date, long}', 'January 2, 2020'],
    ['{d, date, full}', 'Thursday, January 2, 2020'],
  ])('formats %s', (message, expected) => {
    expect(format(message, { d: when })).toBe(expected);
  });

  it.each(['{d, time}', '{d, time, short}', '{d, time, medium}', '{d, time, long}'])(
    'formats %s',
    (message) => {
      expect(format(message, { d: when })).toMatch(/\d{1,2}:\d{2}/);
    },
  );

  // ICU `select` has no exact-value syntax: `=0` there is a parse error, while
  // a bare `0` matches the number and the string alike.
  it.each([
    [0, 'Free'],
    ['0', 'Free'],
    [1, 'Pro'],
    ['enterprise', 'Custom'],
  ])('selects the bare numeric case for %o', (tier, expected) => {
    const message = '{tier, select, 0 {Free} 1 {Pro} other {Custom}}';
    expect(format(message, { tier })).toBe(expected);
  });

  /**
   * The other half of the round trip. `convertMessageToIcu` in `@saykit/config`
   * escapes literal text on the way into a catalogue; these are the exact
   * strings it produces for the cases asserted there, and each one has to come
   * back out as the text an author wrote. A catalogue that formats to anything
   * else is a catalogue that quietly lost a character.
   */
  it.each([
    [`Use '{'name'}' here`, 'Use {name} here'],
    [`a '{{' b '}}' c`, 'a {{ b }} c'],
    [`'''{'`, "'{"],
    [`it'''s`, "it''s"],
    [`don't '{'x'}'`, "don't {x}"],
    // Escaped by nothing, because ICU already reads them as text.
    [`It's a test`, "It's a test"],
    [`the boys'`, "the boys'"],
  ])('formats the escaped literal %j back to its text', (message, expected) => {
    expect(format(message, {})).toBe(expected);
  });

  // An apostrophe that runs into a placeholder rather than into text: quoted
  // wrongly, it swallows the placeholder whole and the value never appears.
  it('keeps a placeholder after an escaped apostrophe', () => {
    expect(plain(format(`Click ''{name}'`, { name: 'Ada' }))).toBe(`Click 'Ada'`);
  });

  it('keeps a branch closed after an escaped apostrophe', () => {
    expect(format(`{n, plural, other {the boys'' #}}`, { n: 2 })).toBe(`the boys' 2`);
  });

  it('applies a plural offset', () => {
    const message = '{n, plural, offset:1 one {you and # other} other {you and # others}}';
    expect(format(message, { n: 3 })).toBe('you and 2 others');
    expect(format(message, { n: 2 })).toBe('you and 1 other');
  });

  // ICU tests an exact value against the *original* number, before the offset
  // is applied; the offset only reaches the CLDR category and `#`. So in the
  // "you and N others" idiom, where the selector counts everyone including you,
  // the branch meaning "nobody else" is `=1`, not `=0`.
  it('matches an exact branch before applying the offset', () => {
    const correct = '{n, plural, offset:1 =1 {nobody else} other {you and # others}}';
    expect(format(correct, { n: 1 })).toBe('nobody else');
    expect(format(correct, { n: 3 })).toBe('you and 2 others');

    const wrong = '{n, plural, offset:1 =0 {nobody else} other {you and # others}}';
    expect(format(wrong, { n: 1 })).toBe('you and 0 others');
  });
});
