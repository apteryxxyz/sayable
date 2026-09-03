import { createCatalogue } from 'saykit';
import en from './locales/en.po';
import fr from './locales/fr.po';
import ja from './locales/ja.po';
import pl from './locales/pl.po';

export const locales = ['en', 'fr', 'pl', 'ja'] as const;
export type Locale = (typeof locales)[number];

const catalogue = createCatalogue({ en, fr, pl, ja });

export default catalogue;
