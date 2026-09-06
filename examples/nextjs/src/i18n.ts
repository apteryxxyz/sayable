import { createWithSay } from '@saykit/react/server';
import { createCatalogue } from 'saykit';
import en from './locales/en.po';
import fr from './locales/fr.po';
import pl from './locales/pl.po';

export const catalogue = createCatalogue({ en, fr, pl });

export const withSay = createWithSay(catalogue);
