import { type NextRequest, NextResponse } from 'next/server.js';

const sayable = { sourceLocale: 'en', locales: ['en', 'fr'] };

export function middleware(request: NextRequest) {
  let respondWith = NextResponse.next();

  const defaultLocale = sayable.sourceLocale;
  let pathLocale = fromUrlPathname(request.nextUrl.pathname);
  if (pathLocale && !sayable.locales.includes(pathLocale))
    pathLocale = undefined;

  if (pathLocale === defaultLocale) {
    // Redirect /{defaultLocale} to /
    request.nextUrl.pathname = request.nextUrl.pathname //
      .replace(`/${defaultLocale}`, '');
    respondWith = NextResponse.redirect(request.nextUrl);
  }
  //
  else if (!pathLocale) {
    let requestLocale = fromRequestCookies(request.cookies) ?? defaultLocale;
    if (!sayable.locales.includes(requestLocale)) requestLocale = defaultLocale;

    request.nextUrl.pathname = `/${requestLocale}${request.nextUrl.pathname}`;

    if (requestLocale === defaultLocale) {
      // Rewrite / to /{defaultLocale}
      respondWith = NextResponse.rewrite(request.nextUrl);
    } else {
      // Redirect / to /{requestLocale}
      respondWith = NextResponse.redirect(request.nextUrl);
    }
  }

  respondWith.cookies.set(
    'preferred-locale',
    pathLocale ?? defaultLocale, //
    { maxAge: 60 * 60 * 24 * 365, path: '/' },
  );

  return respondWith;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

const LOCALE = /^[a-z]{2,3}(-[A-Z][a-z]+)?(-[A-Z]{2}|\d{3})?$/;

function fromUrlPathname(pathname: string, partIndex = 0) {
  const value = pathname.split('/')[partIndex * 2 + 1];
  if (value?.match(LOCALE)) return value;
  return undefined;
}

function fromRequestCookies(
  cookies: NextRequest['cookies'],
  key = 'preferred-locale',
) {
  const value = cookies.get(key)?.value;
  if (value?.match(LOCALE)) return value;
  return undefined;
}
