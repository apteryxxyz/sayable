# @saykit/transform-jsx

> JSX and TSX transformer for [SayKit](https://saykit.js.org).

Extracts and rewrites the `<Say>` macro (and its `<Say.Plural>`, `<Say.Ordinal>`, `<Say.Select>` sub-components) in `.jsx` and `.tsx` files. Used inside a `saykit.config.ts` bucket alongside [`@saykit/transform-js`](https://github.com/k0d13/saykit/tree/main/packages/transform-js).

## Install

```sh
pnpm add -D @saykit/transform-jsx
```

## Usage

```ts title="saykit.config.ts"
import js from '@saykit/transform-js';
import jsx from '@saykit/transform-jsx';

// inside a bucket:
transformer: [js(), jsx()];
```

## Documentation

See [saykit.js.org](https://saykit.js.org).
