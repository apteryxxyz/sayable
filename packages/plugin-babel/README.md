# babel-plugin-saykit

> Babel plugin for [SayKit](https://saykit.js.org).

Use this for Next.js (`.babelrc`), React Native, Expo, Metro, or any Babel-driven pipeline. For Vite, Rollup, Webpack, esbuild, and similar bundlers, use [`unplugin-saykit`](https://github.com/k0d13/saykit/tree/main/packages/plugin-unplugin) instead.

## Install

```sh
pnpm add -D babel-plugin-saykit
```

## Usage

```json title=".babelrc"
{
  "plugins": ["saykit"]
}
```

```js title="babel.config.js"
export default {
  plugins: ['saykit'],
};
```

## Documentation

See [saykit.js.org/integrations/babel](https://saykit.js.org/integrations/babel).
