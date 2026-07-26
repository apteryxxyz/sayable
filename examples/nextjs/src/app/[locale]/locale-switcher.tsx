'use client';

import { Say } from '@saykit/react';
import { usePathname, useRouter } from 'next/navigation';
import { locales } from '../../config';

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
          router.push(pathname.replace(`/${current}`, `/${next}`) || `/${next}`);
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
