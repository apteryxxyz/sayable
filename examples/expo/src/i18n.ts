import { getLocales } from 'expo-localization';
import { createCatalogue } from 'saykit';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';

export const locales = ['en', 'fr', 'ja'] as const;
export type Locale = (typeof locales)[number];

const catalogue = createCatalogue({
  locales: [...locales],
  messages: { en, fr, ja },
});

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

export default catalogue;
