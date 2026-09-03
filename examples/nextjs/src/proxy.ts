import { type NextRequest, NextResponse } from 'next/server';
import { defaultLocale, isLocale, LOCALE_COOKIE, locales } from './config';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathLocale = pathname.split('/')[1];

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
      ? // Serve the source locale at `/` without changing the address bar
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
