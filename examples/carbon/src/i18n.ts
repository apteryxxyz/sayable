import { Say } from 'saykit';
import de from './locales/de.json';
import en from './locales/en-US.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';

export const locales = ['en-US', 'fr', 'de', 'ja'] as const;
export type Locale = (typeof locales)[number];

const say = new Say<Locale>({
  locales: [...locales],
  messages: { 'en-US': en, fr, de, ja },
});

// A command's *definition* is registered with Discord once, for every locale at
// the same time, so the instance handed to `withSay` needs an active locale up
// front: it becomes the default name/description, with the rest attached as
// Discord localisations.
say.activate('en-US');

export default say;
