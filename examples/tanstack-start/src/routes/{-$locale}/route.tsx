import { SayProvider } from '@saykit/react/client';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getCookie, getRequestHeader } from '@tanstack/react-start/server';
import { LocaleSwitcher } from '../../components/locale-switcher';
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from '../../config';
import say, { sayFor } from '../../i18n';

/**
 * Runs on the server only. Reads the locale a returning visitor previously
 * chose, falling back to what their browser asks for. `say.match` does the
 * negotiation: it accepts an exact hit, then a language-prefix hit (`en-AU` →
 * `en-GB`, since that is the first `en-*` in the configured list), and finally
 * returns the source locale.
 */
const detectLocale = createServerFn({ method: 'GET' }).handler(() => {
  const stored = getCookie(LOCALE_COOKIE);
  if (isLocale(stored)) return stored;

  const accepted = (getRequestHeader('accept-language') ?? '')
    .split(',')
    .map((part) => part.split(';')[0]?.trim())
    .filter((part): part is string => !!part);

  return say.match(accepted);
});

export const Route = createFileRoute('/{-$locale}')({
  /**
   * The loader is what makes this server-rendered rather than a client-side
   * flash: by the time the component runs, `messages` is already in the payload.
   */
  async loader({ params }) {
    const locale = isLocale(params.locale) ? params.locale : await detectLocale();
    const request = sayFor(isLocale(locale) ? locale : defaultLocale);

    return { locale: request.locale as Locale, messages: request.messages };
  },
  component: LocaleLayout,
});

function LocaleLayout() {
  const { locale, messages } = Route.useLoaderData();

  return (
    <SayProvider locale={locale} messages={messages}>
      <div className="page" lang={locale}>
        <LocaleSwitcher current={locale} />
        <Outlet />
      </div>
    </SayProvider>
  );
}
