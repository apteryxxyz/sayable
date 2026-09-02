import { createCatalogue } from 'saykit';
import en from './locales/en.po';
import fr from './locales/fr.po';
import ja from './locales/ja.po';
import pl from './locales/pl.po';

export const locales = ['en', 'fr', 'pl', 'ja'] as const;
export type Locale = (typeof locales)[number];

/**
 * The catalogue imports above are *not* parsed at runtime. `unplugin-saykit`
 * resolves each `.po` file at build time and inlines it as a plain JS object,
 * so what ships is a record of strings and nothing more.
 */
const catalogue = createCatalogue({
  locales: [...locales],
  messages: { en, fr, pl, ja },
});

export default catalogue;
