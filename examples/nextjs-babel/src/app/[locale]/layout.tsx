import { SayProvider } from '@saykit/react/client';
import say, { init } from '../../i18n';

export function generateStaticParams() {
  return say.locales.map((l) => ({ locale: l }));
}

export default async function RootLayout({
  params,
  children,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  await init(locale);

  return (
    <html lang={locale}>
      <body>
        <SayProvider {...say}>{children}</SayProvider>
      </body>
    </html>
  );
}
