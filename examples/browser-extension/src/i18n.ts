import { createCatalogue } from 'saykit';
import de from '../_locales/de/messages.json';
import en from '../_locales/en/messages.json';
import fr from '../_locales/fr/messages.json';

export const locales = ['en', 'fr', 'de'] as const;
export type Locale = (typeof locales)[number];

const catalogue = createCatalogue({ en, fr, de });

export function uiSay() {
  return catalogue.locale(catalogue.match(chrome.i18n.getUILanguage()));
}

export default catalogue;
