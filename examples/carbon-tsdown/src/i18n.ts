import { Sayable } from 'sayable';

const say = new Sayable({
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
