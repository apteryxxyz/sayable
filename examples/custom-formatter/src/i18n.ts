import { createCatalogue } from 'saykit';
import de from './locales/de.yml';
import en from './locales/en.yml';
import fr from './locales/fr.yml';

export const locales = ['en', 'fr', 'de'] as const;
export type Locale = (typeof locales)[number];

const catalogue = createCatalogue({ en, fr, de });

/**
 * A CLI's locale comes from the environment, not a browser. `LC_ALL` wins over
 * `LC_MESSAGES`, which wins over `LANG` — the usual POSIX order — and each may
 * carry an encoding suffix (`fr_FR.UTF-8`) that has to come off first.
 */
export function environmentLocale() {
  const raw = process.env.LC_ALL ?? process.env.LC_MESSAGES ?? process.env.LANG ?? '';
  const tag = raw.split('.')[0]?.replace('_', '-');

  return catalogue.match(tag ? [tag] : []);
}

export default catalogue;
