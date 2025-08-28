import { notFound } from 'next/navigation';
import say from '../../sayable';
import { SayableProvider } from './provider';

export default async function RootLayout({
  children,
  params,
}: React.PropsWithChildren<{
  params: Promise<{ locale: typeof say.locale }>;
}>) {
  const { locale } = await params;
  try {
    await say.preload(locale);
    say.activate(locale);
  } catch {
    notFound();
  }

  return (
    <html lang={locale}>
      <body>
        <SayableProvider
          locale={say.locale}
          messages={await say.messages(say.locale)}
        >
          {children}
        </SayableProvider>
      </body>
    </html>
  );
}
