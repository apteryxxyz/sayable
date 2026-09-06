import { SayProvider } from '@saykit/react/client';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getCookie, getRequestHeader } from '@tanstack/react-start/server';
import { LocaleSwitcher } from '../../components/locale-switcher';
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from '../../config';
import { catalogue } from '../../i18n';

const detectLocale = createServerFn({ method: 'GET' }).handler(() => {
  const stored = getCookie(LOCALE_COOKIE);
  if (isLocale(stored)) return stored;

  const accepted = (getRequestHeader('accept-language') ?? '')
    .split(',')
    .map((part) => part.split(';')[0]?.trim())
    .filter((part): part is string => !!part);

  return catalogue.match(accepted);
});

export const Route = createFileRoute('/{-$locale}')({
  async loader({ params }) {
    const locale = isLocale(params.locale) ? params.locale : await detectLocale();
    const say = catalogue.locale(isLocale(locale) ? locale : defaultLocale);

    return { locale: say.locale as Locale, messages: say.messages };
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
