import { createCatalogue } from 'saykit';
import de from '../_locales/de/messages.json';
import en from '../_locales/en/messages.json';
import fr from '../_locales/fr/messages.json';

export const locales = ['en', 'fr', 'de'] as const;
export type Locale = (typeof locales)[number];

const catalogue = createCatalogue({ en, fr, de });

/**
 * Chrome exposes the browser's UI language, not the page's. That is the right
 * signal for extension chrome — the popup should follow the browser, even when
 * the user is reading a page in another language.
 */
export function uiSay() {
  return catalogue.locale(catalogue.match(chrome.i18n.getUILanguage()));
}

export default catalogue;
