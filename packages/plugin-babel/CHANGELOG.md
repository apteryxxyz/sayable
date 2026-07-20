# babel-plugin-saykit

## 0.4.0

### Patch Changes

- Updated dependencies [ccaa461]
- Updated dependencies [326a4d9]
- Updated dependencies [0e96dec]
  - @saykit/config@0.4.0

## 0.3.0

### Minor Changes

- 299fc6c: Write extraction only to the source locale, add message fallbacks, and add a `clean` command.

  Extracted messages are now written to the source locale catalogue only, rather than to every locale. Other locales fall back to the source message when a translation is missing, keeping non-source catalogues focused on real translations. A new `clean` command removes generated catalogue output.

### Patch Changes

- Updated dependencies [299fc6c]
  - @saykit/config@0.3.0

## 0.2.0

### Minor Changes

- 60a8deb: Bump dependencies

### Patch Changes

- Updated dependencies [84550a2]
- Updated dependencies [60a8deb]
- Updated dependencies [44f6f29]
  - @saykit/config@0.2.0

## 0.1.0

### Minor Changes

- ba51e2f: First numbered release

### Patch Changes

- 7f680cd: Initial release
- d7101cb: Split babel transformers into separate transform-js and transform-jsx packages
- 292a0de: Add support for importing translation files directly
- Updated dependencies [ba51e2f]
- Updated dependencies [7520aa8]
- Updated dependencies [7f680cd]
- Updated dependencies [7b75d7c]
- Updated dependencies [d7101cb]
- Updated dependencies [292a0de]
  - @saykit/config@0.1.0
