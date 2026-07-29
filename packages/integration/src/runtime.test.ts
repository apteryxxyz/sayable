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
  it('returns the messages for the active locale', () => {
    expect(make('en').messages).toEqual(messages.en);
  });

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
  it('returns the first locale when no guesses are given', () => {
    expect(make().match()).toBe('en');
  });

  it('returns the first locale when guesses are empty arrays', () => {
    expect(make().match([])).toBe('en');
  });

  it('returns an exact match', () => {
    expect(make().match('fr')).toBe('fr');
  });

  it('flattens array guesses', () => {
    expect(make().match(['zz', 'fr'])).toBe('fr');
  });

  it('matches on the language prefix', () => {
    expect(make().match('fr-CA')).toBe('fr');
  });

  it('skips guesses with an empty prefix', () => {
    expect(make().match('', 'de')).toBe('de');
  });

  it('falls back to the first locale when nothing matches', () => {
    expect(make().match('zz', 'xx-YY')).toBe('en');
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

  it('throws for plural', () => {
    expect(() => say.plural(1, { other: '#' })).toThrow(
      "'Say#plural' is a macro and must be used with the relevant saykit plugin",
    );
  });

  it('throws for ordinal', () => {
    expect(() => say.ordinal(1, { other: '#' })).toThrow(
      "'Say#ordinal' is a macro and must be used with the relevant saykit plugin",
    );
  });

  it('throws for select', () => {
    expect(() => say.select('a', { other: 'b' })).toThrow(
      "'Say#select' is a macro and must be used with the relevant saykit plugin",
    );
  });
});
