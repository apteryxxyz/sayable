import { Say } from '@saykit/react';
import { SayProvider } from '@saykit/react/client';
import type { ReactNode } from 'react';
import type { View } from 'saykit';
import catalogue, { withSay } from '../../i18n';
import './styles.css';
import { LocaleSwitcher } from './locale-switcher';

/** Pre-render one route per configured locale. */
export function generateStaticParams() {
  return catalogue.locales.map((locale) => ({ locale }));
}

/**
 * `locale` and `messages` are injected by `withSay`; `params` and `children`
 * come from Next.js. Spelled out rather than using Next's generated
 * `LayoutProps<'/[locale]'>` global, which only exists once `.next/types` has
 * been built — this way the example typechecks from a clean checkout.
 */
type RootLayoutProps = {
  params: Promise<{ locale: string }>;
  children: ReactNode;
  locale: string;
  messages: View.Messages;
};

async function RootLayout({ locale, messages, children }: RootLayoutProps) {
  return (
    <html lang={locale}>
      <body>
        {/*
          `withSay` resolved `locale` and `messages` for us on the server.
          Handing them to `SayProvider` here serialises the catalogue across the
          RSC boundary exactly once, and every client component below can then
          use `<Say>` without a prop of its own.

          Server components inside `children` do *not* consume this provider —
          they resolve through `getSay()` via the `react-server` export
          condition. Both halves read from the same source, so the two never
          drift apart.
        */}
        <SayProvider locale={locale} messages={messages}>
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
