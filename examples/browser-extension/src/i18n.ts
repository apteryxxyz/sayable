import { Say } from 'saykit';
import de from '../_locales/de/messages.json';
import en from '../_locales/en/messages.json';
import fr from '../_locales/fr/messages.json';

export const locales = ['en', 'fr', 'de'] as const;
export type Locale = (typeof locales)[number];

const say = new Say<Locale>({
  locales: [...locales],
  messages: { en, fr, de },
});

/**
 * Chrome exposes the browser's UI language, not the page's. That is the right
 * signal for extension chrome — the popup should follow the browser, even when
 * the user is reading a page in another language.
 */
export function activateUiLocale() {
  say.activate(say.match(chrome.i18n.getUILanguage()));
  return say;
}

/**
 * Two messages that also appear in `manifest.json`, and therefore need stable,
 * hand-written ids rather than content hashes. Everything else in this
 * extension is keyed by hash; these two are not, because `__MSG_extensionName__`
 * has to name something a human wrote down.
 *
 * They are declared here purely so extraction sees them — the manifest is not
 * JavaScript, so nothing else would put them in the catalogue.
 */
export const manifestStrings = {
  // Translators: the extension's name, shown in the Chrome Web Store and toolbar.
  name: () => say({ id: 'extensionName' })`Reading Time`,
  // Translators: the extension's one-line store description.
  description: () =>
    say({ id: 'extensionDescription' })`Estimate how long a page will take to read.`,
};

export default say;
