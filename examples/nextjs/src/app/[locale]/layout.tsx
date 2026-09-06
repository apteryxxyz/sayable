import { Say } from '@saykit/react';
import { SayProvider } from '@saykit/react/client';
import { getSay } from '@saykit/react/server';
import catalogue, { withSay } from '../../i18n';
import './styles.css';
import { LocaleSwitcher } from './locale-switcher';

export function generateStaticParams() {
  return catalogue.locales.map((locale) => ({ locale }));
}

async function RootLayout({ params, children }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;

  return (
    <html lang={getSay().locale}>
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
  );
}

export default withSay(RootLayout, (props) => props.params.then((params) => params.locale));
