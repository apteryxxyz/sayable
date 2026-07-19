# @saykit/config

> Configuration schema and CLI for [SayKit](https://saykit.js.org).

[![Coverage](https://codecov.io/gh/k0d13/saykit/graph/badge.svg?flag=config)](https://codecov.io/gh/k0d13/saykit?flags%5B0%5D=config)

Provides the `defineConfig` helper, the Zod-validated schema for `saykit.config.ts`, and the `saykit` CLI used to extract messages from your source.

## Install

```sh
pnpm add -D @saykit/config
```

## Configuration

```ts title="saykit.config.ts"
import { defineConfig } from '@saykit/config';
import po from '@saykit/format-po';
import js from '@saykit/transform-js';

export default defineConfig({
  locales: ['en', 'fr'],
  // Optional per-locale fallback chains, most specific first. The source locale
  // (the first entry in `locales`) is always the final fallback.
  fallbackLocales: {
    'en-NZ': ['en-GB'],
    'es-MX': 'es',
  },
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

## CLI

```sh
saykit extract           # extract messages once
saykit extract --watch   # extract and watch for changes
saykit clean             # reconcile other locales against the source
```

Extraction only writes the **source** locale (the first entry in `locales`). Locales that don't
have a file yet are bootstrapped with an empty, header-only catalogue so a TMS can register them;
existing translation files are left untouched. Translated content is owned by your TMS.

At load time (via the unplugin or Babel plugin), each locale module is filled from its fallback
chain, so an untranslated key resolves to a fallback locale and ultimately the source string — the
runtime still loads a single locale.

`saykit clean` reconciles every non-source locale against the current source catalogue: it adds
missing keys (untranslated), drops entries that no longer exist in the source, and preserves any
existing translations. Use it when you want to propagate source changes into locale files yourself
rather than leaving it to your TMS.

## Documentation

Full configuration guide and CLI reference at [saykit.js.org](https://saykit.js.org).
