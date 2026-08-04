# @saykit/format-json

## 0.8.0

## 0.7.0

## 0.6.1

## 0.6.0

## 0.5.0

### Minor Changes

- 0a68c79: Add `includeReferences` and `includeLineNumbers` to the JSON formatter, and export the PO formatter's `FormatterOptions` type

## 0.4.1

## 0.4.0

## 0.3.0

### Minor Changes

- ab3931d: Add `@saykit/format-json`, a JSON catalogue formatter.

  Writes one pretty-printed, flat JSON file per locale, keyed by message id, for projects that want plain JSON i18n bundles without any Gettext tooling. An optional `dialect` option (`'arb'` or `'webextension'`) switches to a richer layout that preserves comments, context, and source references.
