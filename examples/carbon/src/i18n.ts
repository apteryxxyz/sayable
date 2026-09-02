import { createCatalogue } from 'saykit';
import de from './locales/de.json';
import en from './locales/en-US.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';

export const locales = ['en-US', 'fr', 'de', 'ja'] as const;
export type Locale = (typeof locales)[number];

// A command's *definition* is registered with Discord once, for every locale at
// the same time. `withSay` reads every locale's view off the catalogue and
// registers the default locale's name and description, with the rest attached
// as Discord localisations, so the default locale is named here rather than
// held as state on a shared instance.
const catalogue = createCatalogue({
  locales: [...locales],
  defaultLocale: 'en-US',
  messages: { 'en-US': en, fr, de, ja },
});

export default catalogue;
