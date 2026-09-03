# Babel example

SayKit compiled by **Babel and nothing else**: no bundler, no dev server, no loader.
`pnpm build`, then `node dist/main.js`.

This exists to pin down the `catalogues: 'inline'` default: `babel-plugin-saykit` on its
own has to rewrite the macros _and_ resolve the catalogue imports, with no other tool
involved. Every other example runs the plugin alongside a bundler integration, so this is
the only one that would notice if that stopped being true.

## Run

```sh
pnpm start
```

```text
[en]
Welcome to the library
3 books on loan
Your card expires soon

[fr]
Bienvenue à la bibliothèque
3 livres empruntés
Your card expires soon
```

The last line is untranslated in `fr.po`, so it resolves through the fallback chain to the
English source string, merged in at compile time rather than looked up at runtime.

## What to look at

| Thing                                                             | Where             |
| ----------------------------------------------------------------- | ----------------- |
| `plugins: ['saykit']`, no options: the inlining default           | `babel.config.js` |
| `import en from './locales/en.po'`, gone by the time Node sees it | `src/main.ts`     |
| The compiled record, one object literal per locale                | `dist/main.js`    |

Open `dist/main.js` after a build: there is no `.po` file, no PO parser and no SayKit
extractor in the output, just `const en = { … }` and `say.call()` invocations.

## Hot reload

There is none, by design. The record lands inside `dist/main.js`, whose own bytes only
change when you rebuild, which is exactly why a dev server wants `catalogues: 'module'`
and a bundler integration instead. See the
[Babel integration docs](../../website/content/integrations/babel.mdx).
