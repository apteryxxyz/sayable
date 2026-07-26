# Browser extension example

A Manifest V3 Chrome extension that estimates a page's reading time, localised with
[`@saykit/format-json`](../../packages/format-json)'s `webextension` dialect.

This is the example for **making SayKit write files in a layout something else already owns**.

## What it demonstrates

| Concern                                                 | Where              |
| ------------------------------------------------------- | ------------------ |
| `json({ dialect: 'webextension' })`                     | `saykit.config.ts` |
| `{locale}` used as a **directory**, not a filename      | `saykit.config.ts` |
| Explicit `say({ id })` for keys the manifest references | `src/i18n.ts`      |
| `chrome.i18n.getUILanguage()` + `say.match`             | `src/i18n.ts`      |
| Keeping the catalogue out of the content script         | `src/content.ts`   |

## Writing straight into `_locales/`

Chrome requires `_locales/<locale>/messages.json`. A bucket's `output` is a template, and `{locale}`
can sit anywhere in the path — including in a directory segment:

```ts
output: '_locales/{locale}/messages.{extension}',
formatter: json({ dialect: 'webextension' }),
```

`saykit extract` then produces exactly the file Chrome expects:

```json
{
  "extensionName": {
    "message": "Reading Time",
    "description": "The extension's name, shown in the Chrome Web Store and toolbar."
  }
}
```

Translator comments land in `description`, which is the field the Chrome Web Store's translation
tooling shows to translators. Context and source references have no standard slot in that format, so
they round-trip through `x-saykit-context` and `x-saykit-references` — extension fields Chrome
ignores.

## Hashed keys vs. manifest keys

By default SayKit keys a message by a hash of its text and context. That is fine for the runtime,
which looks messages up by the same hash — but it is no good for `manifest.json`, where you must
write the key by hand:

```json
{ "name": "__MSG_extensionName__" }
```

So the two strings the manifest references are given explicit ids:

```ts
say({ id: 'extensionName' })`Reading Time`;
```

They live in `src/i18n.ts` for the sole reason that extraction only sees JavaScript — the manifest
is not code, so nothing else would put those strings in the catalogue. Give an explicit id to any
message that something outside your source has to name; let the rest stay hashed.

## Two i18n systems, one catalogue

Chrome's own `chrome.i18n.getMessage()` and SayKit's runtime both read these files, but they are
not interchangeable: `chrome.i18n` has no ICU support, so it cannot render the plural forms this
popup relies on. The split used here is the practical one — Chrome reads the catalogue for
_manifest_ strings, SayKit reads it for everything at runtime.

## Running it

```sh
pnpm install
pnpm --filter browser-extension-example build
```

Then load `examples/browser-extension` as an unpacked extension in `chrome://extensions` with
Developer Mode on. `pnpm --filter browser-extension-example dev` rebuilds on change.

> Only typechecking and the build are verified in this repo; loading it in Chrome is manual.

Further reading: [message formats](../../website/content/core-concepts/formats.mdx).
