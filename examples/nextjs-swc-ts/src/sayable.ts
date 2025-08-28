import Sayable from 'sayable';

export default new Sayable({
  en: () => import('./locales/en/messages.json'),
  fr: () => import('./locales/fr/messages.json'),
});
