import 'server-only';

import { setSay } from '@saykit/react/server';
import { SayKit } from 'saykit';

const say = new SayKit({
  en: () =>
    import('./locales/en/messages.json', { with: { type: 'json' } }) //
      .then((m) => m.default),
  fr: () =>
    import('./locales/fr/messages.json', { with: { type: 'json' } }) //
      .then((m) => m.default),
});

export async function init(locale: string) {
  await say.load(locale);
  say.activate(locale);
  setSay(say);
  return say;
}

export default say;
