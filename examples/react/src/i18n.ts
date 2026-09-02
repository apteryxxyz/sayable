import { createCatalogue } from 'saykit';

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

export default catalogue;
