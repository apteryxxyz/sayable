import { Sayable } from 'sayable';

// HACK: wrangler and our macro don't play nicely together, so we have to
// import the runtime manually, and assert it as the type of the macro
const say = new Sayable({
  en: () =>
    import('./locales/en/messages.json', { with: { type: 'json' } }) //
      .then((m) => m.default),
  fr: () =>
    import('./locales/fr/messages.json', { with: { type: 'json' } }) //
      .then((m) => m.default),
});

await say.load();
say.activate('en');

export default say;
