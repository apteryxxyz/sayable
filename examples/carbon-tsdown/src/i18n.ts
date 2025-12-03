import { SayKit } from 'saykit';

const say = new SayKit({
  en: () =>
    import('./locales/en/messages.json') //
      .then((m) => m.default),
  fr: () =>
    import('./locales/fr/messages.json') //
      .then((m) => m.default),
});

await say.load();
say.activate('en');

export default say;
