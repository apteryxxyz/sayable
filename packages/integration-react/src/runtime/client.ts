'use client';

import { createContext, createElement, type PropsWithChildren, useContext, useMemo } from 'react';
import { createView, type View } from 'saykit';

const SayContext = createContext<View | null>(null);
SayContext.displayName = 'SayContext';

/**
 * Provide a localised {@link View} to descendant **client** components via context.
 * Must wrap any component tree using {@link useSay} or {@link Say}.
 *
 * The view is rebuilt whenever `locale` or `messages` changes, so keep `messages`
 * referentially stable (module scope, or memoised) rather than passing a fresh object
 * literal on every render.
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
  messages: View.Messages;
}>) {
  // Rebuilt whenever the locale or its messages change, so a locale switch
  // reaches descendants rather than being pinned to the first render. A view
  // needs no catalogue behind it, and being immutable it goes into context as
  // itself rather than behind a ref.
  const say = useMemo(() => createView(locale, messages), [locale, messages]);

  return createElement(SayContext.Provider, { value: say }, children);
}

/**
 * Get the current {@link View}, on the client.
 * Must be called within a {@link SayProvider}.
 *
 * @returns The current {@link View}
 * @throws If no provider is in the component tree
 */
export function useSay() {
  const say = useContext(SayContext);
  if (!say) throw new Error("'useSay' must be used within a 'SayProvider'");
  return say;
}
