import say from 'sayable/macro';
import en from './locales/en/messages.json' with { type: 'json' };
import fr from './locales/fr/messages.json' with { type: 'json' };

say.load('en', en);
say.load('fr', fr);
say.activate('fr');

// Basic message
const hello = say`Hello world!`;

// Parameter example: message with a name
const name = 'John';
const greeting = say`Hello ${name}, welcome back!`;

// Context example: same text, different usage
// TRANSLATORS: File menu action
const openFile = say({ context: 'file menu' })`Open`;
// TRANSLATORS: Physical door action
const openDoor = say({ context: 'physical door' })`Open`;

// Plural example: apples in basket
const appleCount = 3;
const apples = say.plural(appleCount, {
  zero: 'No apples left',
  one: 'One apple left',
  other: '# apples left',
});

// Ordinal example: contestant ranking
const contestantPosition = 2;
const contestantRank = say.ordinal(contestantPosition, {
  1: '#st place',
  2: '#nd place',
  3: '#rd place',
  other: '#th place',
});

// Select example: pronoun usage
const userGender = 'female';
const profilePronoun = say.select(userGender, {
  male: 'He updated his profile',
  female: 'She updated her profile',
  other: 'They updated their profile',
});

// Nested example: cart summary with plural
const itemCount = 1;
const cart = say`You have ${say.plural(itemCount, {
  zero: 'no items',
  one: '1 item',
  other: '# items',
})} in your cart.`;

// Nested example: notifications with select + plural
const messagesCount = 3;
const viewerGender = 'male';
const notifications = say`${say.select(viewerGender, {
  male: 'He',
  female: 'She',
  other: 'They',
})} has ${say.plural(messagesCount, {
  zero: 'no new messages',
  one: '1 new message',
  other: '# new messages',
})}.`;

// **Context-sensitive plural examples: same text, different context**
const itemCountWishlist = 2;
const itemCountCart = 2;

// TRANSLATORS: Number of items in the wishlist
const itemsWishlist = say({ context: 'wishlist' }).plural(itemCountWishlist, {
  zero: 'No items',
  one: '1 item',
  other: '# items',
});

// TRANSLATORS: Number of items in the cart
const itemsCart = say({ context: 'cart' }).plural(itemCountCart, {
  zero: 'No items',
  one: '1 item',
  other: '# items',
});

console.log({
  hello,
  greeting,
  openFile,
  openDoor,
  apples,
  contestantRank,
  profilePronoun,
  cart,
  notifications,
  itemsWishlist,
  itemsCart,
});
