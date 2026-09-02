import { createCatalogue } from 'saykit';
import enGB from './locales/en-GB.json';
import enNZ from './locales/en-NZ.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

/**
 * Every catalogue is already merged with its fallback chain by the time it gets
 * here — `unplugin-saykit` does that in its `load` hook — so `en-NZ` is a
 * complete object, not a sparse override layer.
 *
 * The catalogue is shared by every request this server handles, and safely so:
 * it has no active locale to leak. A request reads the view for its own locale,
 * which is immutable and cannot be reactivated out from under another one.
 */
const catalogue = createCatalogue({
  en: en,
  'en-GB': enGB,
  'en-NZ': enNZ,
  fr: fr,
});

export default catalogue;
