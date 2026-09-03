import { getLocales } from 'expo-localization';
import { createCatalogue, createStore } from 'saykit';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';

export const locales = ['en', 'fr', 'ja'] as const;
export type Locale = (typeof locales)[number];

const catalogue = createCatalogue({ en, fr, ja });

/**
 * The device's language preferences, most-preferred first. `expo-localization`
 * reports these as BCP-47 tags (`fr-CA`, `ja-JP`), which is exactly what
 * `catalogue.match` expects: it tries an exact hit, then a language-prefix hit,
 * then falls back to the default locale.
 */
export function deviceLocale() {
  const tags = getLocales()
    .map((locale) => locale.languageTag)
    .filter((tag): tag is string => !!tag);

  return catalogue.match(tags);
}

/**
 * Which locale is current, and how it changes. A device has one user and one
 * language at a time, so the store is a module-scope value rather than
 * component state: the switcher imports it and calls `set`, and everything
 * that renders reads the view through `SayProvider`.
 */
export const store = createStore(catalogue, deviceLocale());

export default catalogue;
