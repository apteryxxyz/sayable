# @saykit/config

## 1.0.0

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
