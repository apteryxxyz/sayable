import { type NextRequest, NextResponse } from 'next/server';
import { defaultLocale, isLocale, LOCALE_COOKIE, locales } from './config';

/**
 * Locale detection, done at the edge so the App Router only ever sees a
 * `[locale]` segment it can trust.
 *
 * Precedence: an explicit locale in the path wins, then a previously stored
 * cookie, then the browser's `Accept-Language`, then the source locale. The
 * source locale is served from `/` via a rewrite (so `/en/...` stays a canonical
 * redirect target rather than a second URL for the same page).
 *
 * Note this file deliberately does not import `src/i18n.ts`: middleware runs in
 * the edge runtime, and there is no reason to pull three catalogues into it just
 * to read a list of locale codes.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathLocale = pathname.split('/')[1];

  // Already on a real locale route: nothing to do but remember the choice.
  if (isLocale(pathLocale)) {
    const response =
      pathLocale === defaultLocale
        ? // Keep one canonical URL for the source locale: /en/beans → /beans
          NextResponse.redirect(
            new URL(pathname.replace(`/${defaultLocale}`, '') || '/', request.url),
          )
        : NextResponse.next();

    response.cookies.set(LOCALE_COOKIE, pathLocale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    });
    return response;
  }

  const preferred = detect(request);
  const target = new URL(`/${preferred}${pathname}`, request.url);

  const response =
    preferred === defaultLocale
      ? // Serve the source locale at `/` without changing the address bar.
        NextResponse.rewrite(target)
      : NextResponse.redirect(target);

  response.cookies.set(LOCALE_COOKIE, preferred, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  });
  return response;
}

function detect(request: NextRequest) {
  const stored = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;

  // `Accept-Language: fr-CA,fr;q=0.9,en;q=0.8` → ['fr-CA', 'fr', 'en'].
  const accepted = (request.headers.get('accept-language') ?? '')
    .split(',')
    .map((part) => part.split(';')[0]?.trim())
    .filter((part): part is string => !!part);

  for (const candidate of accepted) {
    if (isLocale(candidate)) return candidate;
    const prefix = candidate.split('-')[0];
    const match = locales.find((locale) => locale === prefix);
    if (match) return match;
  }

  return defaultLocale;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
