import Sayable from 'sayable';
import en from './locales/en/messages.json' with { type: 'json' };
import fr from './locales/fr/messages.json' with { type: 'json' };

const say = new Sayable();

say.load('en', en);
say.load('fr', fr);
say.activate('fr');

export default say;
