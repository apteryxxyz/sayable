import { createCatalogue } from 'saykit';
import enGB from './locales/en-GB.json';
import enNZ from './locales/en-NZ.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

export const catalogue = createCatalogue({
  en: en,
  'en-GB': enGB,
  'en-NZ': enNZ,
  fr: fr,
});
