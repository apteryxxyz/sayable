'use client';

import {
  createContext,
  createElement,
  type PropsWithChildren,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { createCatalogue, createStore, type Store, type View } from 'saykit';

const SayContext = createContext<Store | null>(null);
SayContext.displayName = 'SayContext';

/**
 * Where a provider takes its view from.
 *
 * A store is the reactive form: it owns a catalogue, so it can switch locale,
 * and every consumer re-renders when it does. Being a live object, it cannot
 * cross the server/client boundary.
 *
 * A locale and its messages are the serialisable form a server can hand across
 * that boundary. Only that one locale comes over, so the provider built from
 * it has nothing to switch to: switching is the server's to do, normally
 * through navigation.
 */
export type SayProviderProps =
  | { store: Store; locale?: never; messages?: never }
  | { store?: never; locale: string; messages: View.Messages }
  // Nothing at all, which is what `<SayProvider>` inside a `SayScope` is: the
  // server build of this module reads the scope and fills the props in
  | { store?: never; locale?: never; messages?: never };

/**
 * Provide a {@link View} to descendant **client** components via context.
 * Must wrap any component tree using {@link useSay} or {@link Say}.
 *
 * @param props.store The store to follow, for an application that switches
 *   locale on the client
 * @param props.locale The current locale, for one that was given a single
 *   locale by the server
 * @param props.messages The messages for that locale, which should be
 *   referentially stable rather than a fresh object literal per render
 */
export function SayProvider({
  store,
  locale,
  messages,
  children,
}: PropsWithChildren<SayProviderProps>) {
  // One locale and no catalogue, so this store holds the only view there is.
  // Consumers then read a store either way, and `useSay` has one shape
  const held = useMemo(() => {
    if (store) return store;
    if (locale === undefined || !messages)
      throw new Error("'SayProvider' must be given a store, or a locale and its messages");
    return createStore(createCatalogue({ [locale]: messages }), locale);
  }, [store, locale, messages]);

  return createElement(SayContext.Provider, { value: held }, children);
}

/**
 * Get the current {@link View}, on the client.
 * Must be called within a {@link SayProvider}.
 *
 * The component re-renders when the store switches locale, so the view this
 * returns is the current one rather than the one the tree first mounted with.
 *
 * There is no hook for the store behind it: a store is a module-scope value,
 * so a locale picker imports the one it built and calls {@link Store.set} on
 * it. A provider given a locale and its messages has no catalogue to switch
 * through anyway.
 *
 * @returns The current {@link View}
 * @throws If no provider is in the component tree
 */
export function useSay(): View {
  const store = useContext(SayContext);
  if (!store) throw new Error("'useSay' must be used within a 'SayProvider'");
  // Called on the store rather than passed as a bare reference, so a `Store`
  // written as a class, whose `subscribe` reads `this`, works too. Memoised,
  // since a new function each render would resubscribe on each one
  const subscribe = useMemo(() => (listener: () => void) => store.subscribe(listener), [store]);

  // A view's identity changes only when the locale does, and a catalogue hands
  // the same view back for a locale returned to, so this is a stable snapshot.
  // The server snapshot is the same read: either store holds one view at the
  // point the tree was rendered
  return useSyncExternalStore(
    subscribe,
    () => store.say,
    () => store.say,
  );
}
