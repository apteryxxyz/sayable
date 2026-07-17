---
"@saykit/transform-jsx": minor
"@saykit/config": minor
"@saykit/react": minor
---

Add a `whitespace` prop to `<Say>` for controlling whitespace-only text nodes in the rendered output.

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
