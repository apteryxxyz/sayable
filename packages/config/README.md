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
```

## Documentation

Full configuration guide and CLI reference at [saykit.js.org](https://saykit.js.org).
