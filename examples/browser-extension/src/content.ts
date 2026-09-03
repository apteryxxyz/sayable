import { measure } from './reading.js';

chrome.runtime.onMessage.addListener((request, _sender, respond) => {
  if (request?.type !== 'measure') return false;

  respond(measure(document));
  return true;
});
