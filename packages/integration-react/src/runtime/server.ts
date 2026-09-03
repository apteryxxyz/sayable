import 'server-only';
import { cache, type ReactNode } from 'react';
import type { Catalogue, View } from 'saykit';

/**
 * Where the view for the request being rendered lives.
 *
 * `React.cache` is per request, which is the isolation a server needs.
 * `AsyncLocalStorage` cannot do this job here: a server component's children
 * are rendered after it returns rather than inside the call it makes, so there
 * is no callback to wrap them in, which is why {@link SayScope} writes the
 * cell instead.
 *
 * It is also why the cell holds one view for the whole request: a second scope
 * replaces the first for everything rendered after it rather than for its own
 * subtree. `warned` keeps that warning to one per request.
 */
const cell = cache<() => { view: View | undefined; warned: boolean }>(() => ({
  view: undefined,
  warned: false,
}));

/** What a read says when no scope established a view. */
const NO_VIEW =
  "'getSay' must be called below a 'SayScope'. Wrap the tree in " +
  "'<SayScope catalogue={catalogue} locale={locale}>'.";

/** What a second locale in one request is warned about, in development. */
const NESTED_SCOPE = (established: string, next: string) =>
  `A 'SayScope' established '${next}' while '${established}' was already established for this ` +
  "request. A scope is per request rather than per subtree: React renders a server component's " +
  'children after it returns, so there is nowhere to put the previous view back, and everything ' +
  `rendered after this point reads '${next}' - including components outside the inner scope, and ` +
  "the messages 'SayProvider' serialises to the client. Render the other locale in its own " +
  'request, or resolve its view yourself and pass it to the components that need it.';

/**
 * Get the current {@link View}, on the server.
 * Must be called below a {@link SayScope}.
 *
 * The server counterpart of `useSay`. Reach for it when you need the locale as
 * *data*, to build an `Intl.NumberFormat` say, rather than as a rendered
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
   * against it, or a view already resolved.
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
 * {@link getSay} resolve at any depth below, and the scope is per request.
 *
 * Per request is also the limit. React renders a server component's children
 * after it returns, so a scope does not end where its children do: a second
 * scope takes over for everything rendered after it, including components
 * outside it and the messages `<SayProvider>` serialises. Development warns
 * when that happens. Render another locale in its own request, or resolve its
 * view yourself and pass it to the components that need it.
 *
 * A `<SayProvider>` written inside one takes no props of its own: the server
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
  const resolved = view ?? (await catalogue.load(catalogue.match(locale)));
  const request = cell();

  if (
    process.env.NODE_ENV !== 'production' &&
    !request.warned &&
    request.view &&
    request.view.locale !== resolved.locale
  ) {
    request.warned = true;
    console.warn(NESTED_SCOPE(request.view.locale, resolved.locale));
  }

  // The cell is the request's, so this is reachable for the rest of the render
  // and by nothing outside it
  request.view = resolved;

  return children;
}
