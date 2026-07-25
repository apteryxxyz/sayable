import { measure } from './reading.js';

/**
 * Runs in the page. It does no localisation at all — it measures, and hands
 * numbers back to the popup, which is the part the user reads.
 *
 * Keeping the catalogue out of the content script matters: content scripts are
 * injected into every matching page, so anything shipped here is shipped
 * everywhere.
 */
chrome.runtime.onMessage.addListener((request, _sender, respond) => {
  if (request?.type !== 'measure') return false;

  respond(measure(document));
  return true;
});
