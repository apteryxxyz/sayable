import say from '../lib/i18n';

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang={say.locale}>
      <body>{children}</body>
    </html>
  );
}
