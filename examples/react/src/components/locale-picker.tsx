import { Say } from '@saykit/react';
import { useSay } from '@saykit/react/client';
import type { Locale } from '../i18n.js';
import { locales, store } from '../i18n.js';

export function LocalePicker() {
  // `useSay` returns the view held by the nearest `SayProvider`, and re-renders
  // this component when the locale changes. Reach for it when you need the
  // *data* — the active locale, the raw messages — rather than a rendered
  // message. Rendering goes through `<Say>`.
  const say = useSay();

  return (
    <label className="locales">
      <Say>Language</Say>
      <select value={say.locale} onChange={(event) => void store.set(event.target.value as Locale)}>
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale}
          </option>
        ))}
      </select>
    </label>
  );
}
