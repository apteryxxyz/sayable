import { createView, type View } from './view.js';

export namespace Catalogue {
  export type Loader<Locale extends string> = (
    locale: Locale,
  ) => View.Messages | Promise<View.Messages>;

  export type Options<
    Locale extends string,
    Loader extends Catalogue.Loader<Locale> | undefined,
  > = {
    locales: Locale[];
    /**
     * The locale to fall back to. Defaults to the first of {@link locales}.
     */
    defaultLocale?: NoInfer<Locale>;
  } & (
    | { messages: Record<Locale, View.Messages>; loader?: Loader }
    | { messages?: Partial<Record<Locale, View.Messages>>; loader: Loader }
  );
}

/**
 * Everything an application knows how to say: its locales, their messages, and
 * the loader that fetches the ones it does not have yet.
 *
 * A catalogue never formats anything and has no active locale. Formatting is
 * what a {@link View} does, and a view is what `locale` hands back.
 */
export interface Catalogue<Locale extends string = string> {
  /**
   * All available locales.
   */
  readonly locales: readonly Locale[];

  /**
   * The locale to fall back to, and the one {@link match} resolves to when
   * nothing else does.
   */
  readonly defaultLocale: Locale;

  /**
   * A view bound to one locale: callable, immutable, and memoised, so asking
   * twice returns the same view.
   *
   * @param locale Locale to bind to
   * @returns The view for the locale
   * @throws If no messages are loaded for the locale
   */
  locale(locale: Locale): View<Locale>;

  /**
   * Whether a locale's messages are available, and so whether
   * {@link Catalogue.locale} will hand back a view for it.
   *
   * @param locale Locale to check
   */
  loaded(locale: Locale): boolean;

  /**
   * Loads messages for the given locales.
   * If no locales are provided, all available locales are loaded.
   * Requires a {@link Catalogue.Loader} to be provided.
   * If `loader` returns a promise, so will this method.
   *
   * A locale is filled once. Loading one that already has messages is a no-op,
   * which is what lets a view be built once and stay correct: nothing can
   * replace the messages it was built over.
   *
   * @param locales Locales to load messages for, defaults to {@link Catalogue.locales}
   */
  load(...locales: Locale[]): void | Promise<void>;

  /**
   * Matches the best locale from a list of guesses.
   *
   * @param guesses List of locale guesses
   * @returns The best matching locale, or {@link defaultLocale} if no matches are found
   */
  match(...guesses: (string | string[])[]): Locale;

  /**
   * Every locale, paired with its view.
   *
   * @throws If any locale has no messages loaded
   */
  [Symbol.iterator](): IterableIterator<[Locale, View<Locale>]>;
}

/**
 * Create a {@link Catalogue}.
 *
 * @example
 * ```ts
 * const catalogue = createCatalogue({ locales: ['en', 'fr', 'pl'], messages: { en, fr, pl } });
 * const say = catalogue.locale('en');
 * ```
 *
 * @param options Locales, and the messages or loader that fill them
 * @returns The catalogue
 */
export function createCatalogue<
  const Locale extends string = string,
  Loader extends Catalogue.Loader<Locale> | undefined = undefined,
>(options: Catalogue.Options<Locale, Loader>): Catalogue<Locale> {
  const locales = options.locales;
  const loader = options.loader;

  const store = new Map<Locale, View.Messages>();
  const views = new Map<Locale, View<Locale>>();

  /**
   * Fill a locale's messages, once. A view holds the messages it was built
   * over along with the formats compiled from them, so a locale that could be
   * written twice would leave every view built before the second write
   * formatting text nobody can reach any more. Writing once removes the
   * question rather than answering it.
   */
  function fill(locale: Locale, messages: View.Messages) {
    if (!store.has(locale)) store.set(locale, messages);
  }

  const catalogue: Catalogue<Locale> = {
    locales,

    defaultLocale: options.defaultLocale ?? locales[0]!,

    locale(locale) {
      const messages = store.get(locale);
      if (!messages) throw new Error('No messages loaded for locale');

      let view = views.get(locale);
      if (!view) views.set(locale, (view = createView(locale, messages)));
      return view;
    },

    loaded(locale) {
      return store.has(locale);
    },

    load(...requested) {
      const targets = requested.length > 0 ? requested : locales;

      const tasks: Promise<unknown>[] = [];
      for (const locale of targets) {
        if (store.has(locale)) continue;
        if (!loader) throw new Error('No loader provided, cannot load messages');

        const result = loader(locale);
        if (result instanceof Promise) tasks.push(result.then((m) => fill(locale, m)));
        else fill(locale, result);
      }

      if (tasks.length > 0) return Promise.all(tasks).then(() => undefined);
    },

    match(...guesses) {
      const flat = guesses.flat();
      if (flat.length === 0) return catalogue.defaultLocale;

      for (const guess of flat) {
        if (locales.includes(guess as Locale)) return guess as Locale;
        const prefix = guess.split('-')[0];
        if (!prefix) continue;
        const match = locales.find((l) => l.startsWith(prefix));
        if (match) return match;
      }

      return catalogue.defaultLocale;
    },

    *[Symbol.iterator]() {
      for (const locale of locales) {
        yield [locale, catalogue.locale(locale)] as [Locale, View<Locale>];
      }
    },
  };

  if (options.messages) {
    for (const locale in options.messages) fill(locale, options.messages[locale]!);
  }

  // Frozen for the same reason a view is: nothing should be able to swap a
  // catalogue's methods out from under the code holding it. Its messages still
  // fill in over time, which is what `load` is for, and the maps they live in
  // are closure state rather than properties of this object.
  return Object.freeze(catalogue);
}
