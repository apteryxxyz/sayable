/**
 * The locale list lives here, apart from `src/i18n.ts`, because `i18n.ts` is
 * `server-only` — it holds the catalogue and the server view. Client
 * components (the locale switcher) and the middleware both need to know which
 * locales exist without dragging any of that across the boundary.
 */
export const locales = ['en', 'fr', 'pl'] as const;
export type Locale = (typeof locales)[number];

/** The source locale. Served at `/` as well as `/en`, and used when detection fails. */
export const defaultLocale: Locale = 'en';

export const LOCALE_COOKIE = 'x-preferred-locale';

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
