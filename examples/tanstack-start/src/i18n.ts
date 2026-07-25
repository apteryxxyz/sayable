import { Say } from 'saykit';
import { type Locale, locales } from './config';
import enGB from './locales/en-GB.json';
import enNZ from './locales/en-NZ.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

/**
 * Every catalogue is already merged with its fallback chain by the time it gets
 * here — `unplugin-saykit` does that in its `load` hook — so `en-NZ` is a
 * complete object, not a sparse override layer.
 */
const say = new Say<Locale>({
  locales: [...locales],
  messages: {
    en: en,
    'en-GB': enGB,
    'en-NZ': enNZ,
    fr: fr,
  },
});

/**
 * A request-scoped snapshot. The module-level `say` is shared by every request
 * this server handles, so mutating it with `activate` would let one visitor's
 * locale leak into another's response. `clone().activate().freeze()` hands back
 * an instance that cannot be mutated at all.
 */
export function sayFor(locale: Locale) {
  return say.clone().activate(locale).freeze();
}

export default say;
