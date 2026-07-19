# @saykit/format-json

## 1.0.0

### Minor Changes

- ab3931d: Add `@saykit/format-json`, a JSON catalogue formatter.

  Writes one pretty-printed, flat JSON file per locale, keyed by message id, for projects that want plain JSON i18n bundles without any Gettext tooling. An optional `dialect` option (`'arb'` or `'webextension'`) switches to a richer layout that preserves comments, context, and source references.

### Patch Changes

- Updated dependencies [299fc6c]
  - @saykit/config@1.0.0
