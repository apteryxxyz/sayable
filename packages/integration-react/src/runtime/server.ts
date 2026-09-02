import 'server-only';
import { cache, createElement, type ReactNode } from 'react';
import type { Catalogue, View } from 'saykit';

type SayRef = { current: View | null };
const serverContext = cache<() => SayRef>(() => ({ current: null }));

/**
 * Set the current {@link View}, on the server.
 * Must be called before any {@link getSay} calls.
 *
 * A view is immutable, so it is stored as it arrives: there is nothing here to
 * clone or freeze against a concurrent request. A view is also callable, which
 * is why there is no longer a lazy `() => say` form: the two are the same type
 * and nothing could tell them apart.
 *
 * @param say The current {@link View}
 */
export function setSay(say: View): void {
  serverContext().current = say;
}

/**
 * Get the current {@link View}, on the server.
 * Must only be called after any {@link setSay} calls.
 *
 * @returns The current {@link View}
 * @throws If no {@link View} has been set
 */
export function getSay(): View {
  const ref = serverContext();
  if (!ref.current)
    throw new Error('Attempt to access the server-only Say view before initialisation', {
      cause: new Error("'getSay' must be called after 'setSay'"),
    });
  return ref.current;
}

/**
 * Create a {@link withSay} higher-order component factory bound to a specific {@link Catalogue}.
 *
 * @param catalogue The {@link Catalogue} to take views from
 *
 * @returns A {@link withSay} higher-order component factory
 */
export function unstable_createWithSay(catalogue: Catalogue) {
  /**
   * Wrap a server component so that a {@link View} is initialised before render.
   */
  return function withSay<P = unknown>(
    Component: (props: PropsWithSay<P>) => ReactNode,
    getLocale: (props: P) => string | Promise<string>,
  ) {
    return async function WithSay(props: P) {
      const guess = await getLocale(props);
      const locale = catalogue.match(guess);
      await catalogue.load(locale);
      const say = catalogue.locale(locale);
      setSay(say);

      return createElement(Component, {
        ...props,
        locale: say.locale,
        messages: say.messages,
      });
    };
  };
}

export type PropsWithSay<P = unknown> = P & { locale: string; messages: View.Messages };
