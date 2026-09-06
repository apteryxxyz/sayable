import { createCatalogue } from 'saykit';
import de from './locales/de.json';
import en from './locales/en-US.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';

export const locales = ['en-US', 'fr', 'de', 'ja'] as const;
export type Locale = (typeof locales)[number];

export const catalogue = createCatalogue({ 'en-US': en, fr, de, ja });
