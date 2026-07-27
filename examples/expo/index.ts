// @ts-nocheck
// Hermes ships a partial Intl: `Intl.Locale` and `Intl.PluralRules` are absent
// on Android, and messageformat (which powers the saykit runtime) needs both.
// These must be imported before anything touches the runtime, and in this order
// — each polyfill builds on the one above it.
import '@formatjs/intl-getcanonicallocales/polyfill';
import '@formatjs/intl-locale/polyfill';
import '@formatjs/intl-pluralrules/polyfill';
import '@formatjs/intl-pluralrules/locale-data/en';
import '@formatjs/intl-pluralrules/locale-data/fr';
import '@formatjs/intl-pluralrules/locale-data/ja';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
