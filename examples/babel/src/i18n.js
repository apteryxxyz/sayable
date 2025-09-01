import Sayable from 'sayable';

const say = new Sayable({
  en: () => import('./locales/en/messages.json', { with: { type: 'json' } }),
  fr: () => import('./locales/fr/messages.json', { with: { type: 'json' } }),
});

await say.load();
say.activate('fr');

export default say;
