import { Sayable } from 'sayable';

export default new Sayable({
  en: () => import('./locales/en/messages.json', { with: { type: 'json' } }),
  fr: () => import('./locales/fr/messages.json', { with: { type: 'json' } }),
});
