import { createCatalogue } from 'saykit';
import en from './locales/en.po';
import fr from './locales/fr.po';
import pl from './locales/pl.po';

const catalogue = createCatalogue({ en, fr, pl });

export default catalogue;
