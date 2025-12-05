'use client';

import {
  createContext,
  createElement,
  type PropsWithChildren,
  useContext,
  useState,
} from 'react';
import { type ReadonlySayKit, SayKit } from 'saykit';

type SayKitRef = { current: ReadonlySayKit | null };
const SayContext = createContext<SayKitRef>({ current: null });
SayContext.displayName = 'SayContext';

/**
 * Provide a localised {@link runtime.SayKit} instance to descendant **client** components via context.
 * Must wrap any component tree using {@link useSay} or {@link Say}.
 *
 * @param props.locale The current locale
 * @param props.messages The current messages for the locale
 */
export function SayProvider({
  locale,
  locales,
  messages,
  children,
}: PropsWithChildren<{
  locale: string;
  locales: string[];
  messages: SayKit.Messages;
}>) {
  const [say] = useState(() => {
    const instance = new SayKit({});
    for (const l of locales) instance.assign(l, messages);
    instance.activate(locale);
    return instance.freeze();
  });

  return createElement(
    SayContext.Provider,
    { value: { current: say } },
    children,
  );
}

/**
 * Get the current {@link SayKit} **client** instance.
 * Must be called within a {@link SayProvider}.
 *
 * @returns The current {@link SayKit} instance
 * @throws If no provider is in the component tree
 */
export function useSay() {
  const ref = useContext(SayContext);
  if (!ref.current)
    throw new Error("'useSay' must be used within a 'SayProvider'");
  return ref.current;
}
