import { Say } from 'saykit';

export const locales = ['en', 'fr', 'pl', 'ja'] as const;
export type Locale = (typeof locales)[number];

/**
 * One dynamic import per locale. Vite turns each of these into its own chunk,
 * so a French visitor never downloads the Polish or Japanese catalogue.
 *
 * A single `import(`./locales/${locale}.po`)` would work too, but spelling the
 * map out keeps the set of shipped locales statically analysable — and typed.
 */
const catalogues: Record<Locale, () => Promise<{ default: Say.Messages }>> = {
  en: () => import('./locales/en.po'),
  fr: () => import('./locales/fr.po'),
  pl: () => import('./locales/pl.po'),
  ja: () => import('./locales/ja.po'),
};

/**
 * Constructed with a `loader` instead of eager `messages`. `say.load(locale)`
 * returns a promise when the loader does, and caches per locale — calling it
 * again for an already-loaded locale is free.
 */
const say = new Say({
  locales: [...locales],
  loader: async (locale: Locale) => (await catalogues[locale]()).default,
});

export default say;
