'use client';

import { Say } from '@saykit/react';
import { usePathname, useRouter } from 'next/navigation';
import { isLocale, locales } from '../../config';

/**
 * Switching locale here is a *navigation*, not a runtime `activate` call: the
 * locale lives in the URL, so the server re-renders with the right catalogue and
 * the middleware persists the choice in a cookie.
 */
export function LocaleSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="switcher">
      <Say>Language</Say>
      <select
        value={current}
        onChange={(event) => {
          const next = event.target.value;

          // The source locale is served at `/` via a rewrite, so the current
          // pathname may or may not carry a locale prefix. Strip one only if
          // it is really there, then always push an explicitly prefixed URL:
          // the middleware needs to see the new locale in the path to update
          // the cookie, otherwise it would redirect straight back to the old
          // one. `/en/beans` then redirects on to the canonical `/beans`.
          const [, first, ...rest] = pathname.split('/');
          const base = isLocale(first) ? rest.join('/') : [first, ...rest].join('/');

          router.push(`/${next}${base ? `/${base}` : ''}`);
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
