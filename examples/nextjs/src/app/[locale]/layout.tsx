import { Say } from '@saykit/react';
import { SayProvider } from '@saykit/react/client';
import { SayScope } from '@saykit/react/server';
import type { ReactNode } from 'react';
import catalogue from '../../i18n';
import './styles.css';
import { LocaleSwitcher } from './locale-switcher';

/** Pre-render one route per configured locale. */
export function generateStaticParams() {
  return catalogue.locales.map((locale) => ({ locale }));
}

type RootLayoutProps = {
  params: Promise<{ locale: string }>;
  children: ReactNode;
};

export default async function RootLayout({ params, children }: RootLayoutProps) {
  const { locale } = await params;

  return (
    // `SayScope` negotiates the locale against the catalogue and loads its
    // messages before anything below renders, so `<Say>` and `say` resolve at
    // any depth without a prop being threaded through. It is per request, so
    // two visitors on different locales never share a view.
    <SayScope catalogue={catalogue} locale={locale}>
      <html lang={catalogue.match(locale)}>
        <body>
          {/*
            No props: on the server this resolves to the build of
            `@saykit/react/client` that reads the enclosing scope and serialises
            that one locale and its messages across the RSC boundary, which is
            all a client component can be given. Switching locale here is a
            navigation, so one locale is all it needs.
          */}
          <SayProvider>
            <header className="masthead">
              <a className="masthead__brand" href={`/${locale}`}>
                <Say>Harbour Coffee</Say>
              </a>
              <LocaleSwitcher current={locale} />
            </header>

            <main>{children}</main>

            <footer className="footer">
              <Say>
                Prices include VAT. See our <a href="#returns">returns policy</a>.
              </Say>
            </footer>
          </SayProvider>
        </body>
      </html>
    </SayScope>
  );
}
