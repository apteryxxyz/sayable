import 'server-only';
import { unstable_createWithSay } from '@saykit/react/server';
import { Say } from 'saykit';
import en from './locales/en.po';
import fr from './locales/fr.po';

const say = new Say({
  locales: ['en', 'fr'],
  messages: { en, fr },
});

export const withSay = unstable_createWithSay(say);

export default say;
