import { SayProvider } from '@saykit/react/client';
import { StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Board } from './components/board.js';
import { LocalePicker } from './components/locale-picker.js';
import say, { type Locale } from './i18n.js';

function App() {
  const [locale, setLocale] = useState(say.locale);
  const [messages, setMessages] = useState(say.messages);

  const change = useCallback(async (next: Locale) => {
    // `load` is a no-op for a locale that is already cached, so switching back
    // and forth costs one network request per locale for the life of the page.
    await say.load(next);
    say.activate(next);

    setLocale(next);
    setMessages(say.messages);
    document.documentElement.lang = next;
  }, []);

  return (
    // `SayProvider` builds its own frozen `Say` from these two props. Passing
    // `messages` as state is what makes a locale change re-render the tree.
    <SayProvider locale={locale} messages={messages}>
      <LocalePicker onChange={change} />
      <Board />
    </SayProvider>
  );
}

// Resolve and fetch the starting catalogue before the first paint, so the app
// never flashes untranslated content.
const initial = say.match(navigator.languages as string[]);
await say.load(initial);
say.activate(initial);
document.documentElement.lang = initial;

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
