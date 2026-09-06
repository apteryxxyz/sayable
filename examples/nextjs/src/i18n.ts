import { createWithSay } from '@saykit/react/server';
import { createCatalogue } from 'saykit';
import en from './locales/en.po';
import fr from './locales/fr.po';
import pl from './locales/pl.po';

const catalogue = createCatalogue({ en, fr, pl });

/**
 * Wraps a server component so its view is negotiated and established before
 * the component renders. Everything below it - including `<Say>` in nested
 * server components - then resolves through `getSay()` with no prop drilling.
 *
 * Every segment that renders messages wraps itself: Next renders a page before
 * the layout above it, so a layout's view is not established yet when the page
 * runs.
 */
export const withSay = createWithSay(catalogue);

export default catalogue;
