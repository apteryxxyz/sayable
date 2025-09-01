'use client';

import say from '../../i18n';

export function SayableProvider({
  children,
  locale,
  messages,
}: React.PropsWithChildren<{
  locale: typeof say.locale;
  messages: typeof say.messages;
}>) {
  say.assign(locale, messages);
  say.activate(locale);
  return children;
}
