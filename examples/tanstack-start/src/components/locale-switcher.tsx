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

          // Remember the choice so a later visit to `/` server-renders in the
          // right language, rather than negotiating from scratch every time.
          document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

          // The locale lives in the URL, so switching is a navigation. The
          // route loader re-runs on the server and returns the new catalogue.
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
