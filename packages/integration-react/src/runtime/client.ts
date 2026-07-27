'use client';

import { createContext, createElement, type PropsWithChildren, useContext, useMemo } from 'react';
import { type ReadonlySay, Say } from 'saykit';

type SayRef = { current: ReadonlySay | null };
const SayContext = createContext<SayRef>({ current: null });
SayContext.displayName = 'SayContext';

/**
 * Provide a localised {@link runtime.Say} instance to descendant **client** components via context.
 * Must wrap any component tree using {@link useSay} or {@link Say}.
 *
 * @param props.locale The current locale
 * @param props.messages The current messages for the locale
 */
export function SayProvider({
  locale,
  messages,
  children,
}: PropsWithChildren<{
  locale: string;
  messages: Say.Messages;
}>) {
  // Rebuilt whenever the locale or its messages change, so a locale switch
  // reaches descendants rather than being pinned to the first render.
  const ref = useMemo(() => {
    const instance = new Say({ locales: [locale], loader: () => messages });
    instance.load(locale);
    instance.activate(locale);
    return { current: instance.freeze() };
  }, [locale, messages]);

  return createElement(SayContext.Provider, { value: ref }, children);
}

/**
 * Get the current {@link Say} **client** instance.
 * Must be called within a {@link SayProvider}.
 *
 * @returns The current {@link Say} instance
 * @throws If no provider is in the component tree
 */
export function useSay() {
  const ref = useContext(SayContext);
  if (!ref.current) throw new Error("'useSay' must be used within a 'SayProvider'");
  return ref.current;
}
