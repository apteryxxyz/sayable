import { Say } from '@saykit/react';
import { SayProvider } from '@saykit/react/client';
import { SayScope } from '@saykit/react/server';
import type { ReactNode } from 'react';
import catalogue from '../../i18n';
import './styles.css';
import { LocaleSwitcher } from './locale-switcher';

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
    <SayScope catalogue={catalogue} locale={locale}>
      <html lang={catalogue.match(locale)}>
        <body>
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
