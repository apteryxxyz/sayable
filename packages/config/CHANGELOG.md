# @saykit/config

## 0.4.0

### Minor Changes

- ccaa461: Make `saykit clean` only remove orphaned and untranslated entries instead of prefilling locales with source keys.
- 326a4d9: Emit catalogue declarations as `{locale}.d.{extension}.ts` instead of `{locale}.{extension}.d.ts`.

  Delete any leftover `{locale}.{extension}.d.ts` files after upgrading; they are not migrated automatically, and a stale one will shadow the new declaration.

### Patch Changes

- 0e96dec: Stop an untranslated locale from displacing a translation resolved from its fallbacks.

## 0.3.0

### Minor Changes

- 299fc6c: Write extraction only to the source locale, add message fallbacks, and add a `clean` command.

  Extracted messages are now written to the source locale catalogue only, rather than to every locale. Other locales fall back to the source message when a translation is missing, keeping non-source catalogues focused on real translations. A new `clean` command removes generated catalogue output.

## 0.2.0

### Minor Changes

- 84550a2: Stop auto-generating a `.gitignore` next to catalogue files. SayKit no longer writes or overwrites a `.gitignore` in the output directory, leaving it to you to decide which generated files (e.g. `*.d.ts` locale declarations) to commit or ignore. This makes it possible to commit declaration files so CI can type-check without an extra extraction step.
- 60a8deb: Bump dependencies
- 44f6f29: Add a `whitespace` prop to `<Say>` for controlling whitespace-only text nodes in the rendered output.

  When multiple elements sit inside a `<Say>` (e.g. two `<Text>` children), the literal whitespace between them is preserved in the compiled output as a bare string node. This is fine on the web, but stricter environments like React Native error when a string is rendered outside of a text component.

  Set `whitespace={false}` to drop whitespace-only text nodes from the rendered result:

  ```tsx
  <View>
    <Say whitespace={false}>
      <Text>Hello</Text>
      <Text>World</Text>
    </Say>
  </View>
  ```

  The default remains `true`, preserving existing (web-compatible) behaviour.

## 0.1.0

### Minor Changes

- ba51e2f: First numbered release

### Patch Changes

- 7520aa8: Replace `sourceLocale` config option with only first locale in `locales`
- 7f680cd: Initial release
- 7b75d7c: Make formatter a required option for config bucket
- d7101cb: Split babel transformers into separate transform-js and transform-jsx packages
- 292a0de: Add support for importing translation files directly
