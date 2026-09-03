import 'server-only';
import { cache, type ReactNode } from 'react';
import type { Catalogue, View } from 'saykit';

/**
 * Where the view for the request being rendered lives.
 *
 * `React.cache` is per request, which is the isolation a server needs: two
 * requests rendering different locales at the same time each read their own
 * cell. `AsyncLocalStorage` cannot do this job here, because a server
 * component's children are rendered after it returns rather than inside the
 * call it makes, so there is no callback to wrap them in, which is also why
 * {@link SayScope} writes the cell rather than running around its children.
 */
const cell = cache<() => { view: View | undefined }>(() => ({ view: undefined }));

/**
 * What a read says when no scope established a view.
 */
const NO_VIEW =
  "'getSay' must be called below a 'SayScope'. Wrap the tree in " +
  "'<SayScope catalogue={catalogue} locale={locale}>'.";

/**
 * Get the current {@link View}, on the server.
 * Must be called below a {@link SayScope}.
 *
 * The server counterpart of `useSay`: one reads the view the enclosing scope
 * established, the other the view the enclosing provider holds, and both hand
 * back the same kind of value. Reach for it when you need the locale as
 * *data* — to build an `Intl.NumberFormat`, say — rather than as a rendered
 * message, which is what `<Say>` is for.
 *
 * @example
 * ```tsx
 * const say = getSay();
 * const price = new Intl.NumberFormat(say.locale, { style: 'currency', currency }).format(total);
 * ```
 *
 * @returns The current {@link View}
 * @throws If no {@link SayScope} is above the caller
 */
export function getSay(): View {
  const view = cell().view;
  if (!view) throw new Error(NO_VIEW);
  return view;
}

export namespace SayScope {
  /**
   * Which view a scope establishes: a catalogue and a locale to negotiate
   * against it, which is what a request usually has, or a view already
   * resolved, for a caller that took one off a catalogue itself.
   */
  export type Props<Locale extends string = string> = {
    children?: ReactNode;
  } & (
    | { catalogue: Catalogue<Locale>; locale: Catalogue.Guess; view?: never }
    | { view: View<Locale>; catalogue?: never; locale?: never }
  );
}

/**
 * Establish the {@link View} for everything rendered inside it, on the server.
 *
 * Given a catalogue and a locale, the locale is negotiated against the
 * catalogue and its messages are loaded before the children render. Given a
 * view, that view is established as it is. Either way `<Say>` and
 * {@link getSay} resolve at any depth below without a prop being threaded
 * through, and the scope is per request: a concurrent request renders against
 * its own.
 *
 * A `<SayProvider>` written inside one takes no props of its own — the server
 * build of `@saykit/react/client` reads the established view and serialises
 * the locale and its messages across the boundary.
 *
 * @example
 * ```tsx
 * <SayScope catalogue={catalogue} locale={locale}>
 *   <SayProvider>{children}</SayProvider>
 * </SayScope>
 * ```
 *
 * @example
 * ```tsx
 * <SayScope view={await catalogue.load('fr')}>{children}</SayScope>
 * ```
 *
 * @param props.catalogue The catalogue to take the view from
 * @param props.locale The locale to negotiate against it
 * @param props.view A view to establish as it is, instead of both of those
 */
export async function SayScope<Locale extends string>({
  catalogue,
  locale,
  view,
  children,
}: SayScope.Props<Locale>): Promise<ReactNode> {
  // The cell is the request's, so what is left in it is reachable for the rest
  // of the render and by nothing outside it.
  cell().view = view ?? (await catalogue.load(catalogue.match(locale)));

  return children;
}
