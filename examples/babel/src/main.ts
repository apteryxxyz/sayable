import { Say } from 'saykit';
import en from './locales/en.po';
import fr from './locales/fr.po';

const locales = ['en', 'fr'] as const;
type Locale = (typeof locales)[number];

const say = new Say<Locale>({ locales: [...locales], messages: { en, fr } });

const books = 3;

for (const locale of locales) {
  say.activate(locale);

  console.log(`[${locale}]`);
  console.log(say`Welcome to the library`);
  console.log(say.plural(books, { one: `${books} book on loan`, other: `${books} books on loan` }));
  // Untranslated in `fr`, so it falls back to the source locale — the Babel
  // plugin merges the fallback chain into each record at compile time.
  console.log(say`Your card expires soon`);
  console.log();
}
