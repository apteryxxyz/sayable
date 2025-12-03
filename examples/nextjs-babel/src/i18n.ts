import { SayKit } from 'saykit';

export default new SayKit({
  en: () =>
    import('./locales/en/messages.json', { with: { type: 'json' } }) //
      .then((m) => m.default),
  fr: () =>
    import('./locales/fr/messages.json', { with: { type: 'json' } }) //
      .then((m) => m.default),
});
