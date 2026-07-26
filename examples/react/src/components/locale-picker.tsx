import { Say } from '@saykit/react';
import { useSay } from '@saykit/react/client';
import type { Locale } from '../i18n.js';
import { locales } from '../i18n.js';

export function LocalePicker({ onChange }: { onChange: (locale: Locale) => void }) {
  // `useSay` returns the frozen instance held by the nearest `SayProvider`.
  // Reach for it when you need the *data* — the active locale, the raw
  // messages — rather than a rendered message. Rendering goes through `<Say>`.
  const say = useSay();

  return (
    <label className="locales">
      <Say>Language</Say>
      <select value={say.locale} onChange={(event) => onChange(event.target.value as Locale)}>
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale}
          </option>
        ))}
      </select>
    </label>
  );
}
