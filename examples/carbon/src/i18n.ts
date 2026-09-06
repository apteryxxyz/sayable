import { createWithSay } from '@saykit/carbon';
import { createCatalogue } from 'saykit';
import de from './locales/de.json';
import en from './locales/en-US.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';

export const locales = ['en-US', 'fr', 'de', 'ja'] as const;
export type Locale = (typeof locales)[number];

export const catalogue = createCatalogue({ 'en-US': en, fr, de, ja });

/**
 * Wraps a Carbon base class so a command's name, description and options are
 * built once per locale in the catalogue. Bound here so commands do not have
 * to take the catalogue themselves.
 */
export const withSay = createWithSay(catalogue);
