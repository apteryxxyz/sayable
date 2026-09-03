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
 * requires a complete locale record or a loader; several tests deliberately
 * exercise the looser runtime behaviour, so they opt out of that constraint.
 */
const opts = (o: {
  locales: Locale[];
  defaultLocale?: Locale;
  messages?: Partial<Record<Locale, View.Messages>>;
  loader?: Catalogue.Loader<Locale>;
}) => o as Catalogue.Options<Locale, Catalogue.Loader<Locale> | undefined>;

function make() {
  return createCatalogue(opts({ locales: ['en', 'fr', 'de'], messages }));
}

describe('createCatalogue', () => {
  it('assigns messages passed in the options', () => {
    expect(make().locale('en').messages).toEqual(messages.en);
  });

  it('works without messages when a loader is provided', () => {
    const loader = vi.fn((locale: Locale) => messages[locale as 'en' | 'fr'] ?? {});
    const catalogue = createCatalogue({ locales: ['en'], loader });
    expect(catalogue.locales).toEqual(['en']);
    expect(loader).not.toHaveBeenCalled();
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
  it('throws when there are no messages for the locale', () => {
    expect(() => make().locale('de')).toThrow("No messages loaded for locale 'de'");
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
    const catalogue = createCatalogue({ locales: ['de'], loader: () => ({ greeting: 'Hallo' }) });
    catalogue.load('de');
    const view = catalogue.locale('de');
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
  it('loads all locales when none are specified', () => {
    const loader = vi.fn((locale: Locale) => ({ greeting: `hi-${locale}` }));
    const catalogue = createCatalogue({ locales: ['de'], loader });
    expect(catalogue.load()).toBeUndefined();
    expect(loader).toHaveBeenCalledWith('de');
    expect(catalogue.locale('de').messages).toEqual({ greeting: 'hi-de' });
  });

  it('skips locales that already have messages', () => {
    const loader = vi.fn(() => ({ greeting: 'x' }));
    const catalogue = createCatalogue({ locales: ['en', 'fr'], messages, loader });
    catalogue.load('en', 'fr');
    expect(loader).not.toHaveBeenCalled();
  });

  it('fills a locale once, so a second load cannot replace it', async () => {
    let call = 0;
    const catalogue = createCatalogue({
      locales: ['de'],
      loader: async () => ({ greeting: `load-${++call}` }),
    });

    // Two loads in flight at once: the second resolves after the first has
    // already filled the locale, and must not overwrite it.
    await Promise.all([catalogue.load('de'), catalogue.load('de')]);
    expect(catalogue.locale('de').call({ id: 'greeting' })).toBe('load-1');
  });

  it('throws when no loader is provided', () => {
    const catalogue = createCatalogue(opts({ locales: ['de'], messages: {} }));
    expect(() => catalogue.load('de')).toThrow(
      "No loader provided, cannot load messages for locale 'de'",
    );
  });

  it('assigns synchronously returned messages', () => {
    const catalogue = createCatalogue({ locales: ['de'], loader: () => ({ greeting: 'Hallo' }) });
    expect(catalogue.load('de')).toBeUndefined();
    expect(catalogue.locale('de').messages).toEqual({ greeting: 'Hallo' });
  });

  it('returns a promise and assigns when the loader is async', async () => {
    const loader = vi.fn(async (locale: Locale) => ({ greeting: `async-${locale}` }));
    const catalogue = createCatalogue({ locales: ['de'], loader });
    const result = catalogue.load('de');
    expect(result).toBeInstanceOf(Promise);
    await result;
    expect(catalogue.locale('de').messages).toEqual({ greeting: 'async-de' });
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
    expect(() => [...make()]).toThrow("No messages loaded for locale 'de'");
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
