import { createCatalogue, createStore } from 'saykit';

export const locales = ['en', 'fr', 'pl', 'ja'] as const;
export type Locale = (typeof locales)[number];

export const catalogue = createCatalogue({
  en: () => import('./locales/en.po'),
  fr: () => import('./locales/fr.po'),
  pl: () => import('./locales/pl.po'),
  ja: () => import('./locales/ja.po'),
});

const initial = catalogue.match(navigator.languages as string[]);
await catalogue.load(initial);

export const store = createStore(catalogue, initial);
