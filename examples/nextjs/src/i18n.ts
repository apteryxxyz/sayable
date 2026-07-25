import 'server-only';
import { unstable_createWithSay } from '@saykit/react/server';
import { Say } from 'saykit';
import { type Locale, locales } from './config';
import en from './locales/en.po';
import fr from './locales/fr.po';
import pl from './locales/pl.po';

const say = new Say<Locale>({
  locales: [...locales],
  messages: { en, fr, pl },
});

/**
 * Wraps a server component so a `Say` instance is matched, activated, and
 * published into React's request-scoped cache *before* the component renders.
 * Everything below it — including `<Say>` in nested server components — then
 * resolves through `getSay()` with no prop drilling.
 *
 * The wrapped component additionally receives `locale` and `messages` props,
 * which is exactly what needs handing to `SayProvider` at the client boundary.
 */
export const withSay = unstable_createWithSay(say);

export default say;
