import { createCatalogue } from 'saykit';
import en from './locales/en.po';
import fr from './locales/fr.po';
import pl from './locales/pl.po';

/**
 * The catalogue owns the locales and their messages, and nothing else. It is
 * safe to share across requests: it never holds a current locale, so two
 * requests rendering different ones cannot see each other.
 *
 * `<SayScope>` is what binds one of its views to a request; everything below
 * that — `<Say>` in server components, `getSay()` for the locale as data, and
 * the `<SayProvider>` that carries it across to the client — reads it from there.
 */
const catalogue = createCatalogue({ en, fr, pl });

export default catalogue;
