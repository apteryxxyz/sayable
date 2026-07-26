# @saykit/react

## 0.5.0

## 0.2.1

### Patch Changes

- ec1c06d: Ship the default entry as `dist/index.mjs` rather than `dist/index.client.mjs`.

## 0.2.0

### Minor Changes

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

### Patch Changes

- saykit@0.2.0

## 0.1.0

### Minor Changes

- ba51e2f: First numbered release

### Patch Changes

- 7f680cd: Initial release
- d7101cb: Split babel transformers into separate transform-js and transform-jsx packages
- Updated dependencies [ba51e2f]
- Updated dependencies [7f680cd]
  - saykit@0.1.0
