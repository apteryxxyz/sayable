import { describe, expect, it, vi } from 'vitest';
import { type Catalogue, createCatalogue, type View } from './index.js';

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
} satisfies Partial<Record<Locale, View.Messages>>;

/**
 * Build options with partial (or empty) messages. The public `Options` type
 * requires an entry for every locale; several tests deliberately exercise what
 * happens when one is missing, so they opt out of that constraint.
 */
const opts = (o: {
  locales: Locale[];
  defaultLocale?: Locale;
  messages?: Partial<Record<Locale, Catalogue.Source>>;
}) => o as Catalogue.Options<Locale>;

function make() {
  return createCatalogue(opts({ locales: ['en', 'fr', 'de'], messages }));
}

describe('createCatalogue', () => {
  it('assigns messages passed in the options', () => {
    expect(make().locale('en').messages).toEqual(messages.en);
  });

  it('leaves a thunk alone until its locale is asked for', () => {
    const thunk = vi.fn(() => messages.en);
    const catalogue = createCatalogue({ locales: ['en'], messages: { en: thunk } });
    expect(catalogue.locales).toEqual(['en']);
    expect(catalogue.loaded('en')).toBe(false);
    expect(thunk).not.toHaveBeenCalled();
  });

  it('exposes all locales', () => {
    expect(make().locales).toEqual(['en', 'fr', 'de']);
  });

  it('defaults the default locale to the first one', () => {
    expect(make().defaultLocale).toBe('en');
  });

  it('copies the locales it was given, so the caller cannot add one later', () => {
    const locales: Locale[] = ['en'];
    const catalogue = createCatalogue(opts({ locales, messages }));
    locales.push('fr');
    expect(catalogue.locales).toEqual(['en']);
  });

  it('takes a default locale from the options', () => {
    expect(
      createCatalogue(opts({ locales: ['en', 'fr'], messages, defaultLocale: 'fr' })).defaultLocale,
    ).toBe('fr');
  });
});

describe('Catalogue#locale', () => {
  it('throws when the locale has no messages at all', () => {
    expect(() => make().locale('de')).toThrow("No messages for locale 'de'");
  });

  it('throws differently for a thunk nobody has loaded, which is recoverable', () => {
    const catalogue = createCatalogue({ locales: ['de'], messages: { de: () => ({}) } });
    expect(() => catalogue.locale('de')).toThrow(
      "Messages for locale 'de' have not been loaded yet",
    );
  });

  it('returns a view bound to the locale', () => {
    const say = make().locale('fr');
    expect(say.locale).toBe('fr');
    expect(say.messages).toEqual(messages.fr);
  });

  it('memoises, so the same locale is the same view', () => {
    const catalogue = make();
    expect(catalogue.locale('en')).toBe(catalogue.locale('en'));
    expect(catalogue.locale('en')).not.toBe(catalogue.locale('fr'));
  });

  it('keeps handing back the same view once a locale is filled', () => {
    // A locale is written once, so there is no second set of messages for a
    // view to fall out of step with.
    const catalogue = createCatalogue({
      locales: ['de'],
      messages: { de: () => ({ greeting: 'Hallo' }) },
    });
    const view = catalogue.load('de');
    catalogue.load('de');
    expect(catalogue.locale('de')).toBe(view);
  });
});

describe('Catalogue#loaded', () => {
  it('reports whether a locale has messages', () => {
    const catalogue = make();
    expect(catalogue.loaded('en')).toBe(true);
    expect(catalogue.loaded('de')).toBe(false);
  });
});

describe('Catalogue#load', () => {
  it('calls the thunk and hands back the view', () => {
    const thunk = vi.fn(() => ({ greeting: 'Hallo' }));
    const catalogue = createCatalogue({ locales: ['de'], messages: { de: thunk } });

    const view = catalogue.load('de');
    expect(view).toBe(catalogue.locale('de'));
    expect(thunk).toHaveBeenCalledOnce();
    expect(catalogue.locale('de').messages).toEqual({ greeting: 'Hallo' });
  });

  it('does not call a thunk for a locale that already has messages', () => {
    const thunk = vi.fn(() => ({ greeting: 'x' }));
    const catalogue = createCatalogue({
      locales: ['en', 'de'],
      messages: { en: messages.en, de: thunk },
    });

    catalogue.load('de');
    expect(catalogue.load('en')).toBe(catalogue.locale('en'));
    expect(catalogue.load('de')).toBe(catalogue.locale('de'));
    expect(thunk).toHaveBeenCalledOnce();
  });

  it('unwraps the module a dynamic import resolves to', async () => {
    const catalogue = createCatalogue({
      locales: ['de'],
      messages: { de: async () => ({ default: { greeting: 'Hallo' } }) },
    });

    const view = await catalogue.load('de');
    expect(view.messages).toEqual({ greeting: 'Hallo' });
  });

  it('shares one call between loads that overlap', async () => {
    let call = 0;
    const catalogue = createCatalogue({
      locales: ['de'],
      messages: { de: async () => ({ greeting: `load-${++call}` }) },
    });

    // Two loads in flight at once: the second finds the first still running
    // and waits on it rather than starting the thunk again.
    const [first, second] = await Promise.all([catalogue.load('de'), catalogue.load('de')]);
    expect(first).toBe(second);
    expect(call).toBe(1);
    expect(catalogue.locale('de').call({ id: 'greeting' })).toBe('load-1');
  });

  it('lets a locale whose thunk rejected be loaded again', async () => {
    let attempt = 0;
    const catalogue = createCatalogue({
      locales: ['de'],
      messages: {
        de: async () => {
          if (++attempt === 1) throw new Error('offline');
          return { greeting: 'Hallo' };
        },
      },
    });

    await expect(catalogue.load('de')).rejects.toThrow('offline');
    expect((await catalogue.load('de')).messages).toEqual({ greeting: 'Hallo' });
  });

  it('throws for a locale with no entry at all', () => {
    const catalogue = createCatalogue(opts({ locales: ['de'], messages: {} }));
    expect(() => catalogue.load('de')).toThrow("No messages for locale 'de'");
  });

  it('returns a promise only when the thunk does', async () => {
    const catalogue = createCatalogue({
      locales: ['en', 'de'],
      messages: { en: () => messages.en, de: async () => ({ greeting: 'Hallo' }) },
    });

    expect(catalogue.load('en')).not.toBeInstanceOf(Promise);
    const result = catalogue.load('de');
    expect(result).toBeInstanceOf(Promise);
    expect((await result).messages).toEqual({ greeting: 'Hallo' });
  });
});

describe('Catalogue iteration', () => {
  it('yields a view for each locale', () => {
    const catalogue = createCatalogue(opts({ locales: ['en', 'fr'], messages }));
    const entries = [...catalogue];
    expect(entries.map(([locale]) => locale)).toEqual(['en', 'fr']);
    for (const [locale, say] of entries) expect(say.locale).toBe(locale);
  });

  it('throws for a locale with no messages', () => {
    expect(() => [...make()]).toThrow("No messages for locale 'de'");
  });
});

describe('Catalogue#match', () => {
  // Locales are ['en', 'fr', 'de'], so 'en' is the default-locale fallback.
  it.each([
    ['no guesses are given', [], 'en'],
    ['guesses are empty arrays', [[]], 'en'],
    ['a guess matches exactly', ['fr'], 'fr'],
    ['a guess is nested in an array', [['zz', 'fr']], 'fr'],
    ['a guess matches on language prefix', ['fr-CA'], 'fr'],
    ['a guess has an empty prefix', ['', 'de'], 'de'],
    ['nothing matches', ['zz', 'xx-YY'], 'en'],
    ['a guess is absent', [undefined, 'de'], 'de'],
    ['every guess is absent', [undefined, null], 'en'],
    ['an absent guess is nested in an array', [[undefined, 'fr']], 'fr'],
  ])('resolves the locale when %s', (_, guesses, expected) => {
    expect(make().match(...(guesses as Catalogue.Guess[]))).toBe(expected);
  });

  it('falls back to the configured default locale', () => {
    const catalogue = createCatalogue(
      opts({ locales: ['en', 'fr'], messages, defaultLocale: 'fr' }),
    );
    expect(catalogue.match('zz')).toBe('fr');
  });
});

describe('Catalogue immutability', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(make())).toBe(true);
  });
});
