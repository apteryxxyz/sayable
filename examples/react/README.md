# React example

A task board single-page app built on [`@saykit/react`](../../packages/integration-react),
Vite, and [`unplugin-saykit`](../../packages/plugin-unplugin). Client-side only — no SSR, no
routing — so the React integration itself stays in focus.

## What it demonstrates

| API                                                                | Where                              |
| ------------------------------------------------------------------ | ---------------------------------- |
| `createCatalogue({ locales, loader })`, no eager catalogues        | `src/i18n.ts`                      |
| `catalogue.load(locale)`, async, cached per locale                 | `src/main.tsx`                     |
| `SayProvider` fed from React state, so switching locale re-renders | `src/main.tsx`                     |
| `useSay()` for the current view (not for rendering)                | `src/components/locale-picker.tsx` |
| `<Say>` with interpolation                                         | throughout                         |
| `<Say>` with **nested elements** → `<0>` / `<1>` tags              | `board.tsx`, `task-card.tsx`       |
| `<Say.Plural>` including an exact `_0` branch                      | `board.tsx`, `task-card.tsx`       |
| `<Say.Ordinal>` nested inside a sentence                           | `board.tsx`                        |
| `<Say.Select>` over a union type                                   | `task-card.tsx`                    |
| Two transformers in one bucket (`.ts` + `.tsx`)                    | `saykit.config.ts`                 |

## Rich text without markup in the catalogue

```tsx
<Say>
  Nothing here. <a href="#new">Add a task</a> or drag one across from <strong>To do</strong>.
</Say>
```

extracts as a single entry:

```
Nothing here. <0>Add a task</0> or drag one across from <1>To do</1>.
```

A translator gets one sentence with two numbered placeholders, and can reorder or renest them for
their language. At render time `@saykit/react` parses those tags back out and substitutes the
original React elements — the `href` and any event handlers survive, because the elements were never
serialised in the first place.

## Numeric branches and the `_` prefix

JSX attribute names cannot be numbers, so an exact-match branch such as ICU's `=0` is written `_0`:

```tsx
<Say.Plural
  _={open}
  _0="Everything is done."
  one={<>{open} task still open</>}
  other={<>{open} tasks still open</>}
/>
```

`_` is the value being matched; `_0`, `_1`, … are exact numeric branches; everything else is a CLDR
category. The `_`-prefix is stripped during extraction, so the catalogue holds standard ICU.

## Code-split catalogues

`src/i18n.ts` passes a `loader` instead of `messages`, with one `import()` per locale. Vite emits a
chunk per catalogue, so a French visitor never downloads the Polish or Japanese strings. The
trade-off is that `catalogue.load(locale)` must be awaited before the view exists. `src/main.tsx` does it
once at module scope for the detected locale, and again on each switch.

## Running it

```sh
pnpm install
pnpm --filter react-example dev
pnpm --filter react-example extract   # after editing any message
```

Further reading: the [React integration docs](../../website/content/integrations/react.mdx).
