# saykit

> Type-safe i18n library with compile-time macro transforms.

The core runtime for [SayKit](https://saykit.js.org). Exports the `Say` class, which stores your locales, loads message catalogues, and formats messages using ICU MessageFormat.

You author messages with the `` say`...` `` tagged template (and `say.plural`, `say.ordinal`, `say.select`); a SayKit build-tool plugin rewrites them at build time into small runtime calls.

## Install

```sh
pnpm add saykit
```

You will normally also want [`@saykit/config`](https://github.com/k0d13/saykit/tree/main/packages/config) and a build-tool plugin ([`unplugin-saykit`](https://github.com/k0d13/saykit/tree/main/packages/plugin-unplugin) or [`babel-plugin-saykit`](https://github.com/k0d13/saykit/tree/main/packages/plugin-babel)).

## Usage

```ts
import { Say } from 'saykit';
import en from './locales/en.po';
import fr from './locales/fr.po';

const say = new Say({
  locales: ['en', 'fr'],
  messages: { en, fr },
});

say.activate('en');

say`Hello, ${name}!`;
say.plural(count, { one: '1 item', other: '# items' });
```

## Documentation

Full guide at [saykit.js.org](https://saykit.js.org).
