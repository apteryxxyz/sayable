import { SayProvider } from '@saykit/react/client';
import { StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Board } from './components/board.js';
import { LocalePicker } from './components/locale-picker.js';
import catalogue, { type Locale } from './i18n.js';

// Resolve and fetch the starting catalogue before the first paint, so the app
// never flashes untranslated content.
const initial = catalogue.match(navigator.languages as string[]);
const initialSay = await catalogue.load(initial);
document.documentElement.lang = initial;

function App() {
  // A view is callable, and React reads a function passed to `useState` as a
  // lazy initialiser and one passed to the setter as an updater. Both are
  // wrapped so the view is stored rather than called.
  const [say, setSay] = useState(() => initialSay);

  const change = useCallback(async (next: Locale) => {
    // `load` hands back the locale's view, and goes near its thunk only the
    // first time, so switching back and forth costs one network request per
    // locale for the life of the page.
    //
    // A view is immutable and memoised, so state holds the view itself: the
    // new one is a different value, which is exactly what re-renders the tree.
    const nextSay = await catalogue.load(next);
    setSay(() => nextSay);
    document.documentElement.lang = next;
  }, []);

  return (
    // `SayProvider` builds its own view from these two props, which is what
    // carries the locale across to the client components below.
    <SayProvider locale={say.locale} messages={say.messages}>
      <LocalePicker onChange={change} />
      <Board />
    </SayProvider>
  );
}

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
