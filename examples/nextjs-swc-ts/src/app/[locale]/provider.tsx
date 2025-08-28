'use client';

import say from '../../sayable';

export function SayableProvider({
  children,
  locale,
  messages,
}: React.PropsWithChildren<{
  locale: typeof say.locale;
  messages: Awaited<ReturnType<typeof say.messages>>;
}>) {
  say.preload(locale, messages);
  say.activate(locale);
  return children;
}
