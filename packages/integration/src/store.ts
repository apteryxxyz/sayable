import type { Catalogue } from './catalogue.js';
import type { View } from './view.js';

export namespace Store {
  /**
   * Called after a successful switch, with the view that is now current.
   */
  export type Listener<Locale extends string> = (view: View<Locale>) => void;
}

/**
 * Which view is current, and when that changed.
 *
 * A catalogue owns the messages and a view formats against one locale; neither
 * of them switches, because neither of them changes. Switching is the third
 * role, and it is the only one that mutates: a store holds one view at a time,
 * swaps it for another, and tells whoever is listening.
 *
 * That mutation is the point, so a store is a browser value: one locale at a
 * time, one user, module scope. A server handles several locales at once and
 * should reach a view through the request rather than through a value every
 * request can see.
 */
export interface Store<Locale extends string = string> {
  /**
   * The current view: callable, immutable, and safe to hold onto until the
   * next switch.
   *
   * Its identity changes when the locale does, which is what lets a subscriber
   * compare snapshots. Because a catalogue memoises its views, switching away
   * from a locale and back hands the same view back again.
   */
  readonly current: View<Locale>;

  /**
   * The locale the {@link current} view is bound to.
   */
  readonly locale: Locale;

  /**
   * Switch to another locale, loading its messages first if the catalogue does
   * not have them yet.
   *
   * Like {@link Catalogue.load}, this returns a promise only when the thunk
   * does: a locale that is already loaded switches synchronously, so a
   * subscriber sees the new view in the same tick.
   *
   * Switching to the locale that is already current does nothing and notifies
   * nobody, though asking again for a locale still being switched to hands
   * back the switch already in flight. A load that throws leaves the current
   * view where it was.
   *
   * @param locale Locale to switch to
   * @returns Nothing, or a promise that resolves once the switch is done
   */
  set(locale: Locale): void | Promise<void>;

  /**
   * Listen for switches.
   *
   * The listener is called after {@link current} has changed, with the new
   * view. It is not called on subscribe: the current view is already readable.
   *
   * @param listener Called with the view that is now current
   * @returns A function that removes the listener
   */
  subscribe(listener: Store.Listener<Locale>): () => void;
}

/**
 * Create a {@link Store} over a catalogue.
 *
 * @example
 * ```ts
 * const store = createStore(catalogue, 'en');
 *
 * store.subscribe(render);
 * await store.set('fr');
 * store.current`Hello, ${name}!`;
 * ```
 *
 * @param catalogue The catalogue to take views from
 * @param locale The locale to start on, defaults to {@link Catalogue.defaultLocale}
 * @returns The store
 * @throws If the starting locale has no messages loaded
 */
export function createStore<Locale extends string>(
  catalogue: Catalogue<Locale>,
  locale: Locale = catalogue.defaultLocale,
): Store<Locale> {
  // Read now rather than on first access, so a store that was built over a
  // locale nobody has loaded says so here, next to the call that named it,
  // rather than at some later read that only inherited the mistake.
  let current = catalogue.locale(locale);

  const listeners = new Set<Store.Listener<Locale>>();

  /**
   * Which switch is the live one. A slow locale can resolve after a later
   * switch has already landed, and the user asked for the later one, so the
   * stale result is dropped rather than applied on top.
   */
  let generation = 0;

  /**
   * The locale the last switch asked for, which is the current one until a
   * load is in flight. Compared against rather than the current locale, so
   * switching back mid-load is a real switch that cancels the one in flight
   * rather than a no-op the pending load then overwrites.
   */
  let intended = current.locale;

  /**
   * The switch to {@link intended} while it is still in flight, so a second
   * caller asking for the locale already being switched to gets that same
   * promise rather than nothing, and awaiting it waits for the switch.
   */
  let pending: Promise<void> | undefined;

  /**
   * Clear the in-flight switch once it settles, unless a later switch has
   * already replaced it and is the one now waiting.
   */
  function settle(at: number) {
    if (at === generation) pending = undefined;
  }

  function swap(view: View<Locale>, at: number) {
    if (at !== generation) return;
    // A switch back mid-load lands on the view that is already current, and a
    // subscriber is told what changed, so there is nothing to say.
    if (view === current) return;

    current = view;
    for (const listener of listeners) listener(current);
  }

  /**
   * Put the intent back where the view actually is, so a locale whose load
   * threw can be asked for again rather than being remembered as reached.
   */
  function undo(at: number) {
    if (at === generation) intended = current.locale;
  }

  const store: Store<Locale> = {
    get current() {
      return current;
    },

    get locale() {
      return current.locale;
    },

    set(target) {
      if (target === intended) return pending;

      const at = ++generation;
      intended = target;

      try {
        // A locale whose messages are already here comes back from `load`
        // without going near its thunk, which is what keeps a switch between
        // loaded locales synchronous.
        const loading = catalogue.load(target);

        if (loading instanceof Promise)
          return (pending = loading.then(
            (view) => {
              settle(at);
              swap(view, at);
            },
            (error: unknown) => {
              settle(at);
              undo(at);
              throw error;
            },
          ));

        pending = undefined;
        swap(loading, at);
      } catch (error) {
        pending = undefined;
        undo(at);
        throw error;
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  // Frozen like a catalogue and a view: what the store holds changes, which is
  // its whole job, but which methods it holds does not.
  return Object.freeze(
    Object.defineProperties(store, {
      [Symbol.for('nodejs.util.inspect.custom')]: {
        value: (
          _depth: number,
          context: import('node:util').InspectContext,
          inspect: typeof import('node:util').inspect,
        ) => `Store<${inspect(current.locale, context)}> {}`,
      },
    }),
  );
}
