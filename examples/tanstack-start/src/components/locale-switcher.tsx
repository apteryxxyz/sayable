import { Say } from '@saykit/react';
import { useNavigate } from '@tanstack/react-router';
import { type Locale, LOCALE_COOKIE, locales } from '../config';

export function LocaleSwitcher({ current }: { current: Locale }) {
  const navigate = useNavigate();

  return (
    <label className="switcher">
      <Say>Language</Say>
      <select
        value={current}
        onChange={(event) => {
          const next = event.target.value as Locale;

          document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

          void navigate({ to: '/{-$locale}', params: { locale: next } });
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
