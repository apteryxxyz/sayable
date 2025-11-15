import { SayProvider } from '@sayable/react';
import { notFound } from 'next/navigation.js';
import say from '../../i18n';

export default async function RootLayout({
  params,
  children,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  try {
    await say.load(locale);
    say.activate(locale);
  } catch {
    notFound();
  }

  return (
    <html lang={locale}>
      <body>
        <SayProvider {...say}>{children}</SayProvider>
      </body>
    </html>
  );
}
