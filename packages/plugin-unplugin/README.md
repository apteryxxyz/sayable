# unplugin-saykit

> Universal build-tool plugin for [SayKit](https://saykit.js.org).

Works with Vite, Rollup, Rolldown, Webpack, Rspack, esbuild, Farm, and Bun via [unplugin](https://github.com/unjs/unplugin).

## Install

```sh
pnpm add -D unplugin-saykit
```

## Usage

```ts title="vite.config.ts"
import saykit from 'unplugin-saykit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [saykit()],
});
```

Import from the subpath matching your bundler: `/vite`, `/rollup`, `/rolldown`, `/webpack`, `/rspack`, `/esbuild`, `/farm`, or `/bun`.

## Documentation

See [saykit.js.org/integrations/vite](https://saykit.js.org/integrations/vite).
