import { inspect } from 'node:util';
import { describe, expect, it, vi } from 'vitest';
import { type Catalogue, createCatalogue, createStore, type View } from './index.js';

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

describe('createStore', () => {
  it('starts on the locale it is given', () => {
    const store = createStore(make(), 'fr');
    expect(store.locale).toBe('fr');
    expect(store.current.call({ id: 'greeting' })).toBe('Bonjour');
  });

  it("starts on the catalogue's default locale", () => {
    expect(createStore(make()).locale).toBe('en');
  });

  it('throws when the starting locale has no messages', () => {
    expect(() => createStore(make(), 'de')).toThrow("No messages loaded for locale 'de'");
  });

  it('hands back the view the catalogue memoised', () => {
    const catalogue = make();
    expect(createStore(catalogue, 'en').current).toBe(catalogue.locale('en'));
  });

  it('is frozen', () => {
    expect(Object.isFrozen(createStore(make()))).toBe(true);
  });

  it('names the current locale when inspected', () => {
    expect(inspect(createStore(make(), 'fr'))).toBe("Store<'fr'> {}");
  });
});

describe('Store#set', () => {
  it('swaps the current view synchronously when the locale is loaded', () => {
    const store = createStore(make(), 'en');
    expect(store.set('fr')).toBeUndefined();
    expect(store.locale).toBe('fr');
    expect(store.current.call({ id: 'greeting' })).toBe('Bonjour');
  });

  it('loads a locale the catalogue does not have yet', async () => {
    const loader = vi.fn(async () => ({ greeting: 'Hallo' }));
    const catalogue = createCatalogue({
      locales: ['en', 'de'],
      messages: { en: messages.en },
      loader,
    });
    const store = createStore(catalogue, 'en');

    const result = store.set('de');
    expect(result).toBeInstanceOf(Promise);
    // The swap waits for the load, so the old view is still current until then.
    expect(store.locale).toBe('en');

    await result;
    expect(store.locale).toBe('de');
    expect(loader).toHaveBeenCalledWith('de');
  });

  it('stays synchronous when the loader is', () => {
    const catalogue = createCatalogue({
      locales: ['en', 'de'],
      messages: { en: messages.en },
      loader: () => ({ greeting: 'Hallo' }),
    });
    const store = createStore(catalogue, 'en');

    expect(store.set('de')).toBeUndefined();
    expect(store.locale).toBe('de');
  });

  it('does nothing when the locale is already current', () => {
    const store = createStore(make(), 'en');
    const listener = vi.fn();
    store.subscribe(listener);

    expect(store.set('en')).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps the current view when the load fails', async () => {
    const catalogue = createCatalogue({
      locales: ['en', 'de'],
      messages: { en: messages.en },
      loader: async () => {
        throw new Error('offline');
      },
    });
    const store = createStore(catalogue, 'en');
    const listener = vi.fn();
    store.subscribe(listener);

    await expect(store.set('de')).rejects.toThrow('offline');
    expect(store.locale).toBe('en');
    expect(listener).not.toHaveBeenCalled();
  });

  it('lets a locale whose load failed be asked for again', async () => {
    let attempt = 0;
    const catalogue = createCatalogue({
      locales: ['en', 'de'],
      messages: { en: messages.en },
      loader: async () => {
        if (++attempt === 1) throw new Error('offline');
        return { greeting: 'Hallo' };
      },
    });
    const store = createStore(catalogue, 'en');

    await expect(store.set('de')).rejects.toThrow('offline');
    await store.set('de');
    expect(store.locale).toBe('de');
  });

  it('rethrows a loader that throws synchronously', () => {
    const store = createStore(createCatalogue(opts({ locales: ['en', 'de'], messages })), 'en');

    expect(() => store.set('de')).toThrow(
      "No loader provided, cannot load messages for locale 'de'",
    );
    expect(store.locale).toBe('en');
  });

  it('applies the last switch, not the last to resolve', async () => {
    const resolvers = new Map<string, (loaded: View.Messages) => void>();
    const catalogue = createCatalogue({
      locales: ['en', 'fr', 'de'],
      messages: { en: messages.en },
      loader: (locale: Locale) =>
        new Promise<View.Messages>((resolve) => {
          resolvers.set(locale, resolve);
        }),
    });
    const store = createStore(catalogue, 'en');

    const first = store.set('fr');
    const second = store.set('de');

    // The later switch lands first; the earlier one is stale by the time its
    // own load resolves, and must not overwrite it.
    resolvers.get('de')?.({ greeting: 'Hallo' });
    await second;
    expect(store.locale).toBe('de');

    resolvers.get('fr')?.({ greeting: 'Bonjour' });
    await first;
    expect(store.locale).toBe('de');
  });

  it('cancels a switch that is overtaken by a switch back', async () => {
    let resolve!: (loaded: View.Messages) => void;
    const catalogue = createCatalogue({
      locales: ['en', 'de'],
      messages: { en: messages.en },
      loader: () =>
        new Promise<View.Messages>((r) => {
          resolve = r;
        }),
    });
    const store = createStore(catalogue, 'en');

    const switching = store.set('de');
    // Asked for while the load is still in flight: the store is on 'en' and
    // staying there, so the pending switch has been called off.
    expect(store.set('en')).toBeUndefined();

    resolve({ greeting: 'Hallo' });
    await switching;
    expect(store.locale).toBe('en');
  });
});

describe('Store#subscribe', () => {
  it('notifies with the view that is now current', () => {
    const store = createStore(make(), 'en');
    const listener = vi.fn();
    store.subscribe(listener);

    store.set('fr');
    expect(listener).toHaveBeenCalledExactlyOnceWith(store.current);
    expect(store.current.locale).toBe('fr');
  });

  it('does not notify on subscribe', () => {
    const listener = vi.fn();
    createStore(make(), 'en').subscribe(listener);
    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies every listener', () => {
    const store = createStore(make(), 'en');
    const listeners = [vi.fn(), vi.fn()];
    for (const listener of listeners) store.subscribe(listener);

    store.set('fr');
    for (const listener of listeners) expect(listener).toHaveBeenCalledOnce();
  });

  it('stops notifying once unsubscribed', () => {
    const store = createStore(make(), 'en');
    const listener = vi.fn();
    store.subscribe(listener)();

    store.set('fr');
    expect(listener).not.toHaveBeenCalled();
  });

  it('gives a new view identity per locale, and the same one on the way back', () => {
    // What a `useSyncExternalStore` snapshot compares: the identity changes
    // with the locale, and a catalogue memoises, so returning to a locale
    // returns to its view.
    const store = createStore(make(), 'en');
    const en = store.current;

    store.set('fr');
    expect(store.current).not.toBe(en);
    store.set('en');
    expect(store.current).toBe(en);
  });
});
