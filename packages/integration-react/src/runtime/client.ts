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
 * and every consumer re-renders when it does. It is a live object and cannot
 * cross the server/client boundary, so it belongs to an application that holds
 * its catalogue on the client.
 *
 * A locale and its messages are the serialisable form, which is what a server
 * can hand across that boundary. Only that one locale comes over, so the
 * provider built from it has nothing to switch to: switching locale is the
 * server's to do, normally through navigation.
 */
export type SayProviderProps =
  | { store: Store; locale?: never; messages?: never }
  | { store?: never; locale: string; messages: View.Messages }
  // Nothing at all, which is what `<SayProvider>` inside a `SayScope` is: the
  // server build of this module reads the scope and fills the props in. Part
  // of the type because both builds are described by this one declaration.
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
  // A locale and its messages are one locale and no catalogue, so the store
  // built over them holds the only view there is. Consumers then read a store
  // either way, and `useSay` has one shape rather than two.
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
 * There is no hook for the store behind it, because there is nothing to
 * return that the application does not already hold: a store is a module-scope
 * value, so a locale picker imports the one it built and calls
 * {@link Store.set} on it. A provider given a locale and its messages rather
 * than a store has no catalogue to switch through anyway.
 *
 * @returns The current {@link View}
 * @throws If no provider is in the component tree
 */
export function useSay(): View {
  const store = useContext(SayContext);
  if (!store) throw new Error("'useSay' must be used within a 'SayProvider'");
  // A view's identity changes only when the locale does, and a catalogue hands
  // the same view back for a locale returned to, so this is a stable snapshot
  // in both directions. The server snapshot is the same read: a store built
  // from a serialised locale holds one view, and one built on the client holds
  // whatever it held when the tree was rendered.
  return useSyncExternalStore(
    store.subscribe,
    () => store.say,
    () => store.say,
  );
}
