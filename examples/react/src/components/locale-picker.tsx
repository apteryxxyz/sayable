import { Say } from '@saykit/react';
import { useSay } from '@saykit/react/client';
import type { Locale } from '../i18n.js';
import { locales, store } from '../i18n.js';

export function LocalePicker() {
  const say = useSay();

  return (
    <label className="locales">
      <Say>Language</Say>
      <select
        value={say.locale}
        onChange={(event) => {
          void Promise.resolve(store.set(event.target.value as Locale)).catch((error: unknown) => {
            console.error(error);
          });
        }}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale}
          </option>
        ))}
      </select>
    </label>
  );
}
