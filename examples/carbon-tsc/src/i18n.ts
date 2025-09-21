import type { Sayable as MacroSayable } from 'sayable';
import { Sayable } from 'sayable/runtime';

// HACK: wrangler and our macro don't play nicely together, so we have to
// import the runtime manually, and assert it as the type of the macro
const say = new (Sayable as typeof MacroSayable)({
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
