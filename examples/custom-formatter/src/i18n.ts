import { createCatalogue } from 'saykit';
import de from './locales/de.yml';
import en from './locales/en.yml';
import fr from './locales/fr.yml';

export const locales = ['en', 'fr', 'de'] as const;
export type Locale = (typeof locales)[number];

export const catalogue = createCatalogue({ en, fr, de });

export function environmentLocale() {
  const raw = process.env.LC_ALL ?? process.env.LC_MESSAGES ?? process.env.LANG ?? '';
  const tag = raw.split('.')[0]?.replace('_', '-');

  return catalogue.match(tag ? [tag] : []);
}
