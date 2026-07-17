# @saykit/transform-jsx

## 1.0.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [84550a2]
- Updated dependencies [60a8deb]
- Updated dependencies [44f6f29]
  - @saykit/config@1.0.0
  - @saykit/transform-js@1.0.0

## 0.1.0

### Minor Changes

- ba51e2f: First numbered release

### Patch Changes

- d7101cb: Split babel transformers into separate transform-js and transform-jsx packages
- Updated dependencies [ba51e2f]
- Updated dependencies [7520aa8]
- Updated dependencies [7f680cd]
- Updated dependencies [7b75d7c]
- Updated dependencies [d7101cb]
- Updated dependencies [292a0de]
  - @saykit/transform-js@0.1.0
  - @saykit/config@0.1.0
