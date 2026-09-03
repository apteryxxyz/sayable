import { createCatalogue, createStore } from 'saykit';

export const locales = ['en', 'fr', 'pl', 'ja'] as const;
export type Locale = (typeof locales)[number];

/**
 * One dynamic import per locale. Vite turns each of these into its own chunk,
 * so a French visitor never downloads the Polish or Japanese catalogue.
 *
 * A thunk is left alone until its locale is first asked for, and it is called
 * once: `catalogue.load(locale)` hands back the same view every time after
 * that, so switching back and forth costs one request per locale for the life
 * of the page. Each import resolves to a module, and the catalogue reads the
 * messages off its default export.
 */
const catalogue = createCatalogue({
  en: () => import('./locales/en.po'),
  fr: () => import('./locales/fr.po'),
  pl: () => import('./locales/pl.po'),
  ja: () => import('./locales/ja.po'),
});

/**
 * Which locale is current, and how it changes. A browser has one user and one
 * locale at a time, so the store is a module-scope value: anything that
 * switches locale imports it and calls `set`, and everything that renders
 * reads the view through `SayProvider`.
 *
 * The starting locale is negotiated from the browser's own preferences, and
 * fetched before the first paint, so the app never flashes untranslated
 * content. A store needs its starting locale loaded: it holds a view, and
 * there is no view for a locale whose messages have not arrived.
 */
const initial = catalogue.match(navigator.languages as string[]);
await catalogue.load(initial);

export const store = createStore(catalogue, initial);

export default catalogue;
