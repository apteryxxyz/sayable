import { createCatalogue } from 'saykit';
import en from './locales/en.po';
import fr from './locales/fr.po';

const locales = ['en', 'fr'] as const;

const catalogue = createCatalogue({ locales: [...locales], messages: { en, fr } });

const books = 3;

// Iterating a catalogue yields each locale's view, so there is no locale to
// activate and nothing to put back afterwards.
for (const [say, locale] of catalogue) {
  console.log(`[${locale}]`);
  console.log(say`Welcome to the library`);
  console.log(say.plural(books, { one: `${books} book on loan`, other: `${books} books on loan` }));
  // Untranslated in `fr`, so it falls back to the source locale — the Babel
  // plugin merges the fallback chain into each record at compile time.
  console.log(say`Your card expires soon`);
  console.log();
}
