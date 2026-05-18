# @saykit/format-po

> Gettext PO file formatter for [SayKit](https://saykit.js.org).

The default formatter used in every SayKit example.

## Install

```sh
pnpm add -D @saykit/format-po
```

## Usage

```ts title="saykit.config.ts"
import po from '@saykit/format-po';

// inside a bucket:
formatter: po();
```

### Options

- `includeReferences` (default `true`): include `#: file:line` source references.
- `includeLineNumbers` (default `true`): include line numbers in those references.

## Documentation

See [saykit.js.org/core-concepts/formats](https://saykit.js.org/core-concepts/formats).
