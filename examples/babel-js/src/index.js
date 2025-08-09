import say from 'sayable/macro';
import en from './locales/en/messages.json' with { type: 'json' };
import fr from './locales/fr/messages.json' with { type: 'json' };

say.load('en', en);
say.load('fr', fr);
say.activate('fr');

// Basic message
const welcomeMessage = say`Welcome to our website!`;

// Ordinal example: ranking a contestant
const contestantPosition = 2;
const contestantRanking = say.ordinal(contestantPosition, {
  1: '#st place',
  2: '#nd place',
  3: '#rd place',
  other: '#th place',
});

// Plural example: apple count
const appleCount = 5;
const appleCountMessage = say.plural(appleCount, {
  zero: 'No apples left',
  one: 'One apple left',
  many: '# apples left',
  other: '# apples',
});

// Select example: pronoun usage
const userGender = 'female';
const userPronounMessage = say.select(userGender, {
  male: 'He has updated his profile.',
  female: 'She has updated her profile.',
  other: 'They have updated their profile.',
});

// Nested example: cart checkout summary
const itemCount = 1;
const checkoutSummary = say`You have ${say.plural(itemCount, {
  zero: 'no items',
  one: '1 item',
  other: '# items',
})} in your cart.`;

// Nested + select + plural: notification message
const messagesCount = 3;
const viewerGender = 'male';
const notificationMessage = say`${say.select(viewerGender, {
  male: 'He',
  female: 'She',
  other: 'They',
})} has ${say.plural(messagesCount, {
  zero: 'no new messages',
  one: '1 new message',
  other: '# new messages',
})}.`;

// Ordinal + nested select
const winnerGender = 'other';
const place = 1;
const winnerAnnouncement = say`${say.select(winnerGender, {
  male: 'He',
  female: 'She',
  other: 'They',
})} came in ${say.ordinal(place, {
  1: '#st',
  2: '#nd',
  3: '#rd',
  other: '#th',
})} place!`;

// Complex: Event status summary
const attendees = 0;
const speakerGender = 'female';
const eventStatus = say`${say.select(speakerGender, {
  male: 'The speaker',
  female: 'The speaker',
  other: 'The speaker',
})} has ${say.plural(attendees, {
  zero: 'no attendees registered',
  one: '1 attendee registered',
  other: '# attendees registered',
})} for her session.`;

// Logging all messages together
console.log({
  welcomeMessage,
  contestantRanking,
  appleCountMessage,
  userPronounMessage,
  checkoutSummary,
  notificationMessage,
  winnerAnnouncement,
  eventStatus,
});
