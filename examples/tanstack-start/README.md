# TanStack Start example

A conference schedule, server-rendered with TanStack Start and localised with
[`@saykit/react`](../../packages/integration-react) +
[`unplugin-saykit`](../../packages/plugin-unplugin) on Vite.

Read this one for two things the other examples do not cover: **fallback chains** and
**server-side locale negotiation without RSC**.

## What it demonstrates

| Concern                                                  | Where                             |
| -------------------------------------------------------- | --------------------------------- |
| `fallbackLocales` — `en-NZ → en-GB → en`                 | `saykit.config.ts`                |
| `@saykit/format-json` (plain flat catalogues)            | `saykit.config.ts`                |
| Cookie + `Accept-Language` negotiation on the server     | `src/routes/{-$locale}/route.tsx` |
| `say.match(accepted)` for prefix matching                | same                              |
| `clone().activate().freeze()` per request                | `src/i18n.ts`                     |
| Locale resolved in a **loader**, so SSR emits final copy | `src/routes/{-$locale}/route.tsx` |
| `useSay()` → `Intl.DateTimeFormat`                       | `src/routes/{-$locale}/index.tsx` |
| `<Say.Plural>`, `<Say.Select>`, `<Say.Ordinal>`          | `src/routes/{-$locale}/index.tsx` |

## Fallback chains

The locale list is `['en', 'en-GB', 'en-NZ', 'fr']` with:

```ts
fallbackLocales: { 'en-NZ': ['en-GB'] }
```

The source locale is always appended, so `en-NZ` resolves `en-NZ → en-GB → en`. In practice that
means `src/locales/en-NZ.json` only carries the strings that genuinely differ from British English;
everything else falls through. British spellings like _programme_ are written once in `en-GB.json`
and inherited by `en-NZ` for free.

This is resolved **at build time**, in the plugin's `load` hook. The runtime receives one flat,
fully-populated object per locale and never walks a chain at render time.

## Why `clone()` per request

The `Say` exported from `src/i18n.ts` is a module singleton, shared by every request the server
handles. Calling `say.activate('fr')` on it would change the locale for whoever else happens to be
mid-render. `sayFor(locale)` returns `say.clone().activate(locale).freeze()` instead — a snapshot
that is scoped to the request and cannot be mutated at all (`activate`, `load`, and `assign` all
throw on a frozen instance).

The Next.js example solves the same problem differently, using React's request-scoped `cache()` via
`unstable_createWithSay`. That option only exists where there are Server Components; this is the
general answer.

## No RSC here

TanStack Start server-renders ordinary React components, so there is no server/client split to
manage: a single `SayProvider` in the layout route covers both the SSR pass and hydration. `<Say>`
always resolves through `useSay()`.

## Running it

```sh
pnpm install
pnpm --filter tanstack-start-example dev
pnpm --filter tanstack-start-example extract   # after editing any message
```

`/` negotiates a locale from the cookie or `Accept-Language`; `/fr` and `/en-NZ` are explicit. The
route uses TanStack's optional path parameter syntax (`{-$locale}`), so the source locale needs no
prefix.

Further reading: [core concepts](../../website/content/core-concepts) and the
[dynamic loading](../../website/content/guides/dynamic-loading.mdx) guide.
