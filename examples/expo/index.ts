// @ts-nocheck
// Hermes ships a partial Intl, and each polyfill builds on the one above it
import '@formatjs/intl-getcanonicallocales/polyfill';
import '@formatjs/intl-locale/polyfill';
import '@formatjs/intl-pluralrules/polyfill';
import '@formatjs/intl-pluralrules/locale-data/en';
import '@formatjs/intl-pluralrules/locale-data/fr';
import '@formatjs/intl-pluralrules/locale-data/ja';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
