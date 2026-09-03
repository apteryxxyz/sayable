import type { Store } from './store.js';
import type { View } from './view.js';

export namespace Scope {
  /**
   * Where a scope holds the view a piece of work is running under.
   *
   * This is `AsyncLocalStorage`'s own shape, so node's is passed directly and
   * any of the polyfills fits without an adapter. A scope needs no more of one
   * than this, and saykit imports none of them: which storage a server uses,
   * and whether a browser bundle carries one at all, is the application's
   * choice rather than a dependency of this package.
   *
   * @example
   * ```ts
   * import { AsyncLocalStorage } from 'node:async_hooks';
   *
   * const scope = createScope(new AsyncLocalStorage());
   * ```
   */
  export interface Storage {
    /**
     * The view established by the innermost enclosing {@link Scope.run}, if
     * there is one.
     */
    getStore(): View | undefined;

    /**
     * Run a callback with a view in place.
     */
    run<Args extends unknown[], Return>(
      view: View,
      callback: (...args: Args) => Return,
      ...args: Args
    ): Return;
  }

  /**
   * Where a scope reads its view when nothing is running under
   * {@link Scope.run}: the view itself, or a store to read
   * {@link Store.say} from on every access, so a scope established from a
   * store follows that store's switches without subscribing to it.
   */
  export type Source<Locale extends string = string> = View<Locale> | Store<Locale>;
}

/**
 * Which view the work running right now is saying things in.
 *
 * A catalogue owns the messages, a view formats one locale's, and a store
 * holds which of them is current. A scope is how code reaches one without
 * being handed it: {@link Scope.say} is imported once at the top of a module
 * and resolves, on every use, to the view established around the call.
 *
 * On a server that is one view per request, kept across every await and
 * invisible to the requests running beside it, which is what a
 * {@link Scope.Storage} provides. In a browser there is one locale at a time
 * and nothing to isolate, so a scope built without a storage holds one view,
 * and {@link Scope.use} is how a store establishes it.
 */
export interface Scope {
  /**
   * The current view, read through the scope on every use.
   *
   * This is a `View`, so it is callable and carries the macros, but it is not
   * bound to a locale: each read resolves the view established around the
   * call, which is what lets a module import it once at the top and still say
   * the right thing for the request it ends up serving.
   *
   * @throws On use, if no view is in scope
   */
  readonly say: View;

  /**
   * The view in scope, or `undefined` if there is none.
   *
   * {@link say} is what application code says things with. This is for code
   * deciding what to do about a scope rather than reading from it, such as a
   * React provider taking its initial value from the server scope it renders
   * inside, if it renders inside one.
   */
  readonly view: View | undefined;

  /**
   * Run a callback with a view in scope. Everything it calls, at any depth,
   * reads that view from {@link say}.
   *
   * With a {@link Scope.Storage}, each call is isolated: a server runs one per
   * request, asynchronous work started inside keeps its view across every
   * await, and concurrent requests cannot see each other's. Without one, the
   * previous view is put back when the callback returns, so a callback that
   * goes async keeps its view only until its first await.
   *
   * @param view View to establish for the duration
   * @param callback Callback to run
   * @param args Arguments to call it with
   * @returns Whatever the callback returns
   */
  run<Args extends unknown[], Return>(
    view: View,
    callback: (...args: Args) => Return,
    ...args: Args
  ): Return;

  /**
   * Establish the view to read outside any {@link run}.
   *
   * A browser has one locale at a time and no request to hang a scope on, so
   * this is how it establishes one, usually from a store, which is read on
   * every access and so follows its switches.
   *
   * A server should prefer a scope per request. This is still useful there for
   * a process that only ever serves one locale, such as a CLI or a worker.
   *
   * @param source The view to read, or a store to read it from, or `undefined`
   *   to leave none
   * @returns A function that puts back whatever was there before
   */
  use(source: Scope.Source | undefined): () => void;
}

/**
 * What a read says when nothing established a view.
 */
const NO_VIEW =
  "No view is in scope for 'say'. Run the work inside 'scope.run(view, callback)', or " +
  "establish one with 'scope.use(store)'.";

/**
 * Hold one view in a variable, for a scope built without a storage.
 *
 * A browser has one user and one locale at a time, so there is nothing to keep
 * apart and nothing to carry across an await. Anywhere that does have
 * concurrent work in one process wants a real {@link Scope.Storage}.
 */
function createVariableStorage(): Scope.Storage {
  let running: View | undefined;

  return {
    getStore: () => running,

    run(view, callback, ...args) {
      const previous = running;
      running = view;
      try {
        return callback(...args);
      } finally {
        running = previous;
      }
    },
  };
}

/**
 * Create a {@link Scope}.
 *
 * @example
 * ```ts
 * // A server: one view per request, and `say` anywhere inside it.
 * export const scope = createScope(new AsyncLocalStorage());
 * export const { say } = scope;
 *
 * scope.run(catalogue.locale(locale), handler);
 * ```
 *
 * @example
 * ```ts
 * // A browser: one locale at a time, read from a store.
 * export const { say, use } = createScope();
 *
 * use(store);
 * ```
 *
 * @param storage Where to hold the view the work running right now is saying
 *   things in, normally an `AsyncLocalStorage`. Left out, the scope holds one
 *   view for the whole program, which is what a browser wants
 * @returns The scope
 */
export function createScope(storage: Scope.Storage = createVariableStorage()): Scope {
  /**
   * Where {@link Scope.view} looks when no `run` encloses the call. Held as a
   * source rather than as a view, so a store established here is read on every
   * access and a switch is seen without subscribing to it.
   */
  let source: Scope.Source | undefined;

  function peek(): View | undefined {
    const running = storage.getStore();
    if (running) return running;
    if (!source) return undefined;
    // A view is callable and a store is not, which tells the two apart without
    // either of them having to declare which it is.
    return typeof source === 'function' ? source : source.say;
  }

  function resolve(): View {
    const view = peek();
    if (!view) throw new Error(NO_VIEW);
    return view;
  }

  // An arrow function, so the target has no `prototype` to keep in step with
  // the view's, and no `this` of its own for a stray call to reach.
  const target = (() => {}) as unknown as View;

  const say = new Proxy(target, {
    // `say` is a macro, and a view throws when one reaches the runtime
    // untransformed. Resolved first either way, so a call with no view in
    // scope is reported as a missing scope rather than as a missing plugin.
    apply: (_target, _this, args: unknown[]) =>
      (resolve() as (...a: unknown[]) => unknown)(...args),
    get: (_target, property) => Reflect.get(resolve(), property),
    has: (_target, property) => Reflect.has(resolve(), property),
    ownKeys: () => Reflect.ownKeys(resolve()),
    getOwnPropertyDescriptor: (_target, property) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(resolve(), property);
      // A view is frozen, and a proxy may not report a property as
      // non-configurable when its target does not have it at all. Reported as
      // configurable, which is all `Object.keys(say)` and spreading read.
      return descriptor && { ...descriptor, configurable: true };
    },
    // A scope resolves a view; it is not somewhere to put one.
    set: () => false,
    defineProperty: () => false,
    deleteProperty: () => false,
  }) as View;

  const scope: Scope = {
    say,

    get view() {
      return peek();
    },

    run(view, callback, ...args) {
      return storage.run(view, callback, ...args);
    },

    use(next) {
      const previous = source;
      source = next;
      return () => {
        source = previous;
      };
    },
  };

  // Frozen like a catalogue, a view and a store: which view a scope resolves
  // to changes, which methods it has does not.
  return Object.freeze(
    Object.defineProperties(scope, {
      [Symbol.for('nodejs.util.inspect.custom')]: {
        value: (
          _depth: number,
          context: import('node:util').InspectContext,
          inspect: typeof import('node:util').inspect,
        ) => {
          const view = peek();
          return `Scope<${view ? inspect(view.locale, context) : 'unset'}> {}`;
        },
      },
    }),
  );
}
