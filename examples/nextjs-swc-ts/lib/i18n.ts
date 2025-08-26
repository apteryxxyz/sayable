// NOTE: There is no native react/nextjs support, yet

import Sayable from 'sayable';
import en from './locales/en/messages.json';
import fr from './locales/fr/messages.json';

const say = new Sayable();
say.load('en', en);
say.load('fr', fr);
say.activate('fr');

export default say;
