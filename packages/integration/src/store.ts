import type { Catalogue } from './catalogue.js';
import type { View } from './view.js';

export namespace Store {
  /** Called after a successful switch, with the view that is now current. */
  export type Listener<Locale extends string> = (view: View<Locale>) => void;
}

/**
 * Which view is current, and when that changed.
 *
 * A catalogue owns the messages and a view formats one locale's; neither of
 * them mutates. A store is the role that does: it holds one view at a time,
 * swaps it for another, and tells whoever is listening.
 *
 * That mutation is the point, so a store is a browser value: one locale, one
 * user, module scope. A server handles several locales at once and should
 * reach a view through the request instead.
 */
export interface Store<Locale extends string = string> {
  /**
   * The current view: callable, immutable, and safe to hold onto until the
   * next switch.
   *
   * It is named for the tag a message is written against, so a store can be
   * formatted through directly, and it is read at the moment of access rather
   * than bound once. Read it per call: a `const say = store.say` held across a
   * switch is the old view.
   *
   * Its identity changes when the locale does, which is what lets a subscriber
   * compare snapshots. Because a catalogue memoises views, switching away and
   * back hands the same view back.
   *
   * @example
   * ```ts
   * store.say`Hello, ${name}!`;
   * store.say.locale; // 'en'
   * ```
   */
  readonly say: View<Locale>;

  /**
   * Switch to another locale, loading its messages first if the catalogue does
   * not have them yet.
   *
   * Like {@link Catalogue.load}, this returns a promise only when the thunk
   * does: a locale that is already loaded switches synchronously, so a
   * subscriber sees the new view in the same tick.
   *
   * Switching to the current locale does nothing, though asking again for a
   * locale still being switched to hands back the switch already in flight. A
   * load that throws leaves the current view where it was.
   *
   * @param locale Locale to switch to
   * @returns Nothing, or a promise that resolves once the switch is done
   */
  set(locale: Locale): void | Promise<void>;

  /**
   * Listen for switches. The listener is called after {@link Store.say} has
   * changed, and not on subscribe: the current view is already readable.
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
 * store.say`Hello, ${name}!`;
 * store.say.locale; // 'fr'
 * ```
 *
 * @param catalogue The catalogue to take views from
 * @param locale The locale to start on, defaults to the first of
 *   {@link Catalogue.locales}
 * @returns The store
 * @throws If the starting locale has no messages loaded
 */
export function createStore<Locale extends string>(
  catalogue: Catalogue<Locale>,
  locale: Locale = catalogue.locales[0],
): Store<Locale> {
  // Read now rather than on first access, so a store built over a locale
  // nobody has loaded says so next to the call that named it
  let current = catalogue.locale(locale);

  const listeners = new Set<Store.Listener<Locale>>();

  /**
   * Which switch is the live one, so a slow locale resolving after a later
   * switch has landed is dropped rather than applied on top.
   */
  let generation = 0;

  /**
   * The locale the last switch asked for. Compared against rather than the
   * current locale, so switching back mid-load cancels the load in flight
   * rather than being a no-op that load then overwrites.
   */
  let intended = current.locale;

  /**
   * The switch to {@link intended} while it is still in flight, so a second
   * caller asking for that locale gets the same promise and can await it.
   */
  let pending: Promise<void> | undefined;

  /**
   * Clear the in-flight switch once it settles, unless a later switch has
   * already replaced it.
   */
  function settle(at: number) {
    if (at === generation) pending = undefined;
  }

  function swap(view: View<Locale>, at: number) {
    if (at !== generation) return;
    // A switch back mid-load lands on the view that is already current, and a
    // subscriber is told what changed, so there is nothing to say
    if (view === current) return;

    current = view;
    for (const listener of listeners) listener(current);
  }

  /**
   * Put the intent back where the view is, so a locale whose load threw can be
   * asked for again rather than remembered as reached.
   */
  function undo(at: number) {
    if (at === generation) intended = current.locale;
  }

  const store: Store<Locale> = {
    get say() {
      return current;
    },

    set(target) {
      if (target === intended) return pending;

      const at = ++generation;
      intended = target;

      try {
        // A locale whose messages are already here comes back from `load`
        // without going near its thunk, which is what keeps a switch between
        // loaded locales synchronous
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

  // Frozen like a catalogue and a view: what it holds changes, which methods
  // it has does not
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
