import { type ReactNode, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Renderer } from '~/components/renderer.js';

// The compiled message for two adjacent elements inside a `<Say>` keeps the
// literal whitespace between the slots, e.g.
//
//   <View>
//     <Say>
//       <Text>Hello</Text>
//       <Text>World</Text>
//     </Say>
//   </View>
//
// becomes the message `<0>Hello</0> <1>World</1>`. On the web the bare space
// between the two elements is harmless, but React Native throws because a
// string is being rendered outside of a text component.

/** Map every slot to a plain wrapper so the tree is easy to inspect. */
const components = { 0: 'span', 1: 'span' } as const;

/** Collect every leaf node (string or element) produced by the renderer. */
function leaves(node: ReactNode): ReactNode[] {
  if (node == null || typeof node === 'boolean') return [];
  if (Array.isArray(node)) return node.flatMap(leaves);
  if (isValidElement(node))
    return [node, ...leaves((node.props as { children?: ReactNode }).children)];
  return [node];
}

/** All bare string nodes rendered anywhere in the tree. */
function strings(node: ReactNode) {
  return leaves(node).filter((n): n is string => typeof n === 'string');
}

describe('Renderer whitespace handling', () => {
  const html = '<0>Hello</0> <1>World</1>';

  it('keeps whitespace between elements by default (web behaviour)', () => {
    const tree = Renderer({ html, components });
    expect(strings(tree)).toEqual(['Hello', ' ', 'World']);
  });

  it('keeps whitespace when whitespace is explicitly true', () => {
    const tree = Renderer({ html, components, whitespace: true });
    expect(strings(tree)).toContain(' ');
  });

  it('drops the whitespace-only node when whitespace is false (React Native)', () => {
    const tree = Renderer({ html, components, whitespace: false });
    // The space between the two <Text> slots is gone...
    expect(strings(tree)).toEqual(['Hello', 'World']);
    // ...so nothing renders a bare whitespace string outside of an element.
    expect(strings(tree)).not.toContain(' ');
  });

  it('preserves meaningful text around elements when stripping whitespace', () => {
    // `Hi <0>there</0>!` — the significant spaces are part of real words here.
    const tree = Renderer({ html: 'Hi <0>there</0>!', components, whitespace: false });
    expect(strings(tree)).toEqual(['Hi ', 'there', '!']);
  });

  it('drops leading and trailing whitespace-only nodes when stripping', () => {
    const tree = Renderer({ html: ' <0>Hello</0> ', components, whitespace: false });
    expect(strings(tree)).toEqual(['Hello']);
  });
});
