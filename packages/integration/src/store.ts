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
   * nobody. A load that throws leaves the current view where it was.
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

  function swap(view: View<Locale>, at: number) {
    if (at !== generation) return;

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
      if (target === intended) return;

      const at = ++generation;
      intended = target;

      try {
        // A locale whose messages are already here comes back from `load`
        // without going near its thunk, which is what keeps a switch between
        // loaded locales synchronous.
        const loading = catalogue.load(target);

        if (loading instanceof Promise)
          return loading.then(
            (view) => swap(view, at),
            (error: unknown) => {
              undo(at);
              throw error;
            },
          );

        swap(loading, at);
      } catch (error) {
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
