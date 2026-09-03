'use client';

import { Say } from '@saykit/react';
import { usePathname, useRouter } from 'next/navigation';
import { isLocale, locales } from '../../config';

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
