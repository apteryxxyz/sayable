import { notFound } from 'next/navigation';
import say from '../../i18n';
import { SayableProvider } from './provider';

export default async function RootLayout({
  children,
  params,
}: React.PropsWithChildren<{
  params: Promise<{ locale: typeof say.locale }>;
}>) {
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
        <SayableProvider locale={say.locale} messages={say.messages}>
          {children}
        </SayableProvider>
      </body>
    </html>
  );
}
