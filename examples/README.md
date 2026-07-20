# Examples

Each example deliberately covers a different combination of formatter, build
plugin, and import style, so between them they exercise every supported path.
When changing anything in `packages/`, running all three is a decent smoke test.

| Example                            | Formatter                  | Build plugin               | Import style             | Locales                  |
| ---------------------------------- | -------------------------- | -------------------------- | ------------------------ | ------------------------ |
| [carbon](./carbon)                 | `json()` (plain)           | `unplugin-saykit/rolldown` | dynamic `await import()` | `en`, `fr`, `de` (empty) |
| [nextjs](./nextjs)                 | `po()`                     | `babel-plugin-saykit`      | static `import`          | `en`, `fr`               |
| [tanstack-start](./tanstack-start) | `json({ dialect: 'arb' })` | `unplugin-saykit/vite`     | dynamic `await import()` | `en`, `fr`               |

## What each one is for

- **carbon** — a Discord bot on Cloudflare Workers. Plain JSON catalogues and the
  only example with an **untranslated locale**: `de` is extracted with every
  value empty, so the built `de` chunk should contain the English strings via the
  fallback chain. If a change breaks fallback merging, this is where it shows.
- **nextjs** — App Router, server and client components. The only example on the
  Babel plugin, which inlines catalogues into the importing module rather than
  producing a catalogue module, and the only one using static imports.
- **tanstack-start** — Vite. Uses the ARB dialect, so catalogue metadata
  (`context` on the `Reset` message) round-trips through sibling `@key` objects.

## Checking them

```sh
pnpm --filter carbon-example         extract   # regenerate catalogues
pnpm --filter carbon-example         check     # tsc --noEmit
pnpm --filter carbon-example         build
```

`extract` only ever writes the source locale (`en`). Other locales are created
empty on first run and then left alone; `saykit clean` reconciles them against
the source, which is also what regenerates their `.d.{extension}.ts` files.

### Verifying the fallback chain

The clearest end-to-end check is carbon's untranslated locale:

```sh
pnpm --filter carbon-example build
head dist/de-*.mjs   # should show English strings, not empty ones
```

## Known gaps

- `@saykit/transform-jsx` passes empty arrays for comments and source references
  where `@saykit/transform-js` extracts both, so no JSX example can show a
  `translators:` comment in its catalogue. The ARB example demonstrates metadata
  via `context` instead, which comes from the `<Say>` prop rather than the parser.
- The plain `json()` formatter has no metadata slot, so carbon's catalogues carry
  only strings even though `transform-js` does extract references for them. Use
  the ARB dialect if you need metadata preserved.
