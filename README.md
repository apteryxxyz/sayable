# SayKit

> Compile-time i18n for JavaScript, TypeScript, React, Next.js, TanStack Start, Carbon, and more.

[![Coverage](https://codecov.io/gh/k0d13/saykit/graph/badge.svg)](https://codecov.io/gh/k0d13/saykit)

SayKit is a framework-agnostic internationalisation toolkit built around compile-time message extraction, typed configuration, and small runtime primitives. You write messages inline with tagged templates or JSX, and SayKit takes care of extracting them into translation files, generating stable identifiers, and rendering them at runtime.

> [!WARNING]
> SayKit is under active development. APIs may change before the stable 1.0 release.

## Highlights

- Tagged-template and JSX authoring: `` say`Hello, ${name}!` `` or `<Say>Hello, {name}!</Say>`
- Compile-time extraction from JS, TS, JSX, and TSX via Babel or unplugin
- ICU MessageFormat support for plurals, ordinals, and select
- Typed `saykit.config.ts` with a Zod-validated schema
- A small core runtime, with optional framework adapters
- Import translation files directly: no build-time replacement, no shipped extraction

## Documentation

Full docs live at [saykit.js.org](https://saykit.js.org) (or run the [`website`](./website) workspace locally). The site covers:

- [Introduction and installation](./website/content/getting-started)
- [Messages, configuration, and the runtime](./website/content/core-concepts)
- [React and Carbon integrations](./website/content/integrations)

## Packages

This is a pnpm monorepo. The published packages live in [`packages/*`](./packages).

| Package                                             | Description                                                          |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| [`saykit`](./packages/integration)                  | Core runtime: the `Say` class, macros, and ICU formatting            |
| [`@saykit/config`](./packages/config)               | Config schema (`defineConfig`) and the `saykit` CLI                  |
| [`@saykit/react`](./packages/integration-react)     | React integration: `<Say>`, `SayProvider`, server helpers            |
| [`@saykit/carbon`](./packages/integration-carbon)   | Carbon Discord-bot integration                                       |
| [`unplugin-saykit`](./packages/plugin-unplugin)     | Universal bundler plugin (Vite, Rollup, Webpack, esbuild, Rspack, …) |
| [`babel-plugin-saykit`](./packages/plugin-babel)    | Babel plugin for SayKit                                              |
| [`@saykit/transform-js`](./packages/transform-js)   | JS/TS macro transformer (used by plugins)                            |
| [`@saykit/transform-jsx`](./packages/transform-jsx) | JSX/TSX macro transformer (used by plugins)                          |
| [`@saykit/format-po`](./packages/format-po)         | Gettext PO formatter                                                 |

## Examples

End-to-end examples live in [`examples/*`](./examples):

- [`examples/nextjs`](./examples/nextjs): Next.js App Router with the Babel plugin
- [`examples/tanstack-start`](./examples/tanstack-start): TanStack Start with Vite + unplugin
- [`examples/carbon`](./examples/carbon): Carbon Discord bot deployed to Cloudflare Workers

## Quick start

```sh
pnpm add saykit @saykit/config @saykit/format-po @saykit/transform-js
```

```ts title="saykit.config.ts"
import { defineConfig } from '@saykit/config';
import po from '@saykit/format-po';
import js from '@saykit/transform-js';

export default defineConfig({
  locales: ['en', 'fr'],
  buckets: [
    {
      include: ['src/**/*.ts'],
      output: 'src/locales/{locale}.{extension}',
      formatter: po(),
      transformer: js(),
    },
  ],
});
```

```ts title="src/app.ts"
import { Say } from 'saykit';
import en from './locales/en.po';
import fr from './locales/fr.po';

const say = new Say({ locales: ['en', 'fr'], messages: { en, fr } });
say.activate('en');

console.log(say`Hello, ${'world'}!`);
```

```sh
pnpm saykit extract
```

For framework-specific setup, see the React and Carbon integration docs.

## Development

```sh
pnpm install
pnpm build      # build all packages
pnpm test       # run package tests
pnpm check      # type-check all packages
pnpm lint       # oxlint
pnpm format     # oxfmt
```

The repo uses [Turborepo](https://turbo.build/) for task orchestration and [Changesets](https://github.com/changesets/changesets) for versioning and publishing.
