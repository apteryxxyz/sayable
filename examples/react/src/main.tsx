import { SayProvider } from '@saykit/react/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Board } from './components/board.js';
import { LocalePicker } from './components/locale-picker.js';
import { store } from './i18n.js';

document.documentElement.lang = store.say.locale;
store.subscribe((say) => {
  document.documentElement.lang = say.locale;
});

function App() {
  return (
    <SayProvider store={store}>
      <LocalePicker />
      <Board />
    </SayProvider>
  );
}

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
