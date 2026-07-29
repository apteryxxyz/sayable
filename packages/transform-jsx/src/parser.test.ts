import { parseExpression } from '@babel/parser';
import * as t from '@babel/types';
import {
  ArgumentMessage,
  AUTO_INCREMENT_IDENTIFIER,
  ChoiceMessage,
  CompositeMessage,
  ElementMessage,
  LiteralMessage,
} from '@saykit/config/features/messages';
import { describe, expect, it } from 'vitest';
import * as parser from './parser.js';

// Parse a snippet of real JSX into its element node, the way the transformer
// does (see index.ts) — the `jsx` plugin is what makes `<Say />` an expression.
function jsx(strings: TemplateStringsArray): t.JSXElement {
  return parseExpression(strings.join(''), {
    plugins: ['jsx', 'typescript'],
  }) as unknown as t.JSXElement;
}

describe('parseJSXContainerElement', () => {
  it('returns null for self-closing elements', () => {
    expect(parser.parseJSXContainerElement(jsx`<Say />`)).toBeNull();
  });

  it('returns null for non-Say elements', () => {
    expect(parser.parseJSXContainerElement(jsx`<div></div>`)).toBeNull();
  });

  it('parses text children as LiteralMessage', () => {
    const result = parser.parseJSXContainerElement(jsx`<Say>Hello</Say>`);
    expect(result).toBeInstanceOf(CompositeMessage);
    expect(result!.children[0]).toEqual(new LiteralMessage('Hello'));
  });

  it('normalises whitespace in text children', () => {
    const result = parser.parseJSXContainerElement(jsx`
      <Say>
        Hello,
        world!
      </Say>
    `);
    expect((result!.children[0] as LiteralMessage).text).toBe('Hello, world!');
  });

  it('parses expression children as ArgumentMessage', () => {
    const result = parser.parseJSXContainerElement(jsx`<Say>{name}</Say>`);
    expect(result!.children[0]).toBeInstanceOf(ArgumentMessage);
    expect((result!.children[0] as ArgumentMessage).identifier).toBe('name');
  });

  it('parses fragment children as ElementMessage', () => {
    const result = parser.parseJSXContainerElement(jsx`<Say><></></Say>`);
    expect(result!.children[0]).toBeInstanceOf(ElementMessage);
  });

  it('parses nested JSX children as ElementMessage (non-Say fallback)', () => {
    const result = parser.parseJSXContainerElement(jsx`
      <Say>
        <strong>bold</strong>
      </Say>
    `);
    expect(result!.children[0]).toBeInstanceOf(ElementMessage);
  });

  it('reads id and context descriptor attributes', () => {
    const result = parser.parseJSXContainerElement(jsx`<Say id="msg" context="nav">Hi</Say>`);
    expect(result!.descriptor).toEqual({ id: 'msg', context: 'nav' });
  });

  it('drops text children that are only whitespace', () => {
    const result = parser.parseJSXContainerElement(jsx`<Say>{name}   </Say>`);
    expect(result!.children).toHaveLength(1);
    expect(result!.children[0]).toBeInstanceOf(ArgumentMessage);
  });

  it('ignores expression containers that hold no expression', () => {
    const result = parser.parseJSXContainerElement(jsx`<Say>{/* empty */}</Say>`);
    expect(result!.children).toHaveLength(0);
  });

  it('ignores an id attribute whose value is not a string literal', () => {
    const result = parser.parseJSXContainerElement(jsx`<Say id={dynamic}>Hi</Say>`);
    expect(result!.descriptor.id).toBeUndefined();
  });

  it('ignores a whitespace attribute whose value is not a boolean literal', () => {
    const result = parser.parseJSXContainerElement(jsx`<Say whitespace={dynamic}>Hi</Say>`);
    expect(result!.whitespace).toBeUndefined();
  });

  it('leaves descriptor fields undefined when attributes are absent', () => {
    const result = parser.parseJSXContainerElement(jsx`<Say>Hi</Say>`);
    expect(result!.descriptor).toEqual({ id: undefined, context: undefined });
  });

  it('ignores spread attributes when reading descriptors and whitespace', () => {
    const result = parser.parseJSXContainerElement(jsx`<Say {...rest} id="msg">Hi</Say>`);
    expect(result!.descriptor).toEqual({ id: 'msg', context: undefined });
    expect(result!.whitespace).toBeUndefined();
  });

  it('leaves whitespace undefined when the attribute is absent', () => {
    const result = parser.parseJSXContainerElement(jsx`<Say>Hi</Say>`);
    expect(result!.whitespace).toBeUndefined();
  });

  it('reads whitespace={false} attribute as a boolean', () => {
    const result = parser.parseJSXContainerElement(jsx`<Say whitespace={false}>Hi</Say>`);
    expect(result!.whitespace).toBe(false);
  });

  it('treats a bare whitespace attribute as true', () => {
    const result = parser.parseJSXContainerElement(jsx`<Say whitespace>Hi</Say>`);
    expect(result!.whitespace).toBe(true);
  });
});

describe('parseJSXOpeningElement', () => {
  it('returns null for non-self-closing elements', () => {
    expect(parser.parseJSXOpeningElement(jsx`<Say></Say>`.openingElement)).toBeNull();
  });

  it('returns null for non-Say elements', () => {
    expect(parser.parseJSXOpeningElement(jsx`<div />`.openingElement)).toBeNull();
  });

  it('returns null for unknown Say member (e.g. Say.foo)', () => {
    expect(parser.parseJSXOpeningElement(jsx`<Say.foo />`.openingElement)).toBeNull();
  });

  it('returns null when _ initialiser attribute is missing', () => {
    expect(parser.parseJSXOpeningElement(jsx`<Say.plural one="item" />`.openingElement)).toBeNull();
  });

  it('parses Say.plural with string literal branches', () => {
    const result = parser.parseJSXOpeningElement(
      jsx`
      <Say.plural _={count} one="item" other="items" />
    `.openingElement,
    );
    expect(result).toBeInstanceOf(CompositeMessage);
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice).toBeInstanceOf(ChoiceMessage);
    expect(choice.kind).toBe('plural');
    expect(choice.identifier).toBe('count');
    expect(choice.branches).toHaveLength(2);
    expect(choice.branches[0]).toEqual({ identifier: 'one', value: new LiteralMessage('item') });
    expect(choice.branches[1]).toEqual({ identifier: 'other', value: new LiteralMessage('items') });
  });

  it('parses Say.select and Say.ordinal variants', () => {
    const select = parser.parseJSXOpeningElement(jsx`<Say.select _={val} a="A" />`.openingElement);
    expect((select!.children[0] as ChoiceMessage).kind).toBe('select');

    const ordinal = parser.parseJSXOpeningElement(
      jsx`<Say.ordinal _={val} a="A" />`.openingElement,
    );
    expect((ordinal!.children[0] as ChoiceMessage).kind).toBe('ordinal');
  });

  it('strips leading underscore from numeric branch names (e.g. _0 → 0)', () => {
    const result = parser.parseJSXOpeningElement(
      jsx`
      <Say.plural _={count} _0="zero" other="many" />
    `.openingElement,
    );
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice.branches[0]!.identifier).toBe('0');
  });

  it('accepts a JSX element expression as a branch value', () => {
    const result = parser.parseJSXOpeningElement(
      jsx`
      <Say.plural _={count} one={<b>Bold</b>} />
    `.openingElement,
    );
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice.branches[0]!.value).toBeInstanceOf(ElementMessage);
  });

  it('accepts a JSX fragment expression as a branch value', () => {
    const result = parser.parseJSXOpeningElement(
      jsx`
      <Say.plural _={count} one={<></>} />
    `.openingElement,
    );
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice.branches[0]!.value).toBeInstanceOf(ElementMessage);
  });

  it('skips branch attributes with no value', () => {
    const result = parser.parseJSXOpeningElement(
      jsx`
      <Say.plural _={count} one other="items" />
    `.openingElement,
    );
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice.branches).toHaveLength(1);
    expect(choice.branches[0]!.identifier).toBe('other');
  });

  it('skips branch attributes whose container holds no expression', () => {
    // Real JSX forbids an empty attribute expression (`one={}`), so the empty
    // container is injected directly onto an otherwise-parsed element.
    const opening = jsx`<Say.plural _={count} other="items" />`.openingElement;
    opening.attributes.push(
      t.jsxAttribute(t.jsxIdentifier('one'), t.jsxExpressionContainer(t.jsxEmptyExpression())),
    );
    const choice = parser.parseJSXOpeningElement(opening)!.children[0] as ChoiceMessage;
    expect(choice.branches).toHaveLength(1);
    expect(choice.branches[0]!.identifier).toBe('other');
  });

  it('returns null when the `_` initialiser has no usable value', () => {
    expect(
      parser.parseJSXOpeningElement(jsx`<Say.plural _ one="item" />`.openingElement),
    ).toBeNull();
  });

  it('accepts an expression as a branch value (ArgumentMessage)', () => {
    const result = parser.parseJSXOpeningElement(
      jsx`
      <Say.plural _={count} one={label} />
    `.openingElement,
    );
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice.branches[0]!.value).toBeInstanceOf(ArgumentMessage);
  });

  it('reads id and context descriptor attributes', () => {
    const result = parser.parseJSXOpeningElement(
      jsx`
      <Say.plural id="item-count" context="shop" _={count} one="item" />
    `.openingElement,
    );
    expect(result!.descriptor).toEqual({ id: 'item-count', context: 'shop' });
  });

  it('ignores spread attributes among the branches and descriptors', () => {
    const result = parser.parseJSXOpeningElement(
      jsx`
      <Say.plural {...rest} _={count} one="item" />
    `.openingElement,
    );
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice.identifier).toBe('count');
    expect(choice.branches).toHaveLength(1);
    expect(choice.branches[0]!.identifier).toBe('one');
  });

  it('reads the branch name from a namespaced attribute', () => {
    const result = parser.parseJSXOpeningElement(
      jsx`
      <Say.plural _={count} ns:one="item" />
    `.openingElement,
    );
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice.branches[0]!.identifier).toBe('one');
  });

  it('accepts a string-literal `_` initialiser (auto-increment identifier)', () => {
    const result = parser.parseJSXOpeningElement(
      jsx`<Say.plural _="count" one="item" />`.openingElement,
    );
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice.identifier).toBe(AUTO_INCREMENT_IDENTIFIER);
  });
});

describe('parseJSXElement', () => {
  it('delegates to container parser for non-self-closing Say', () => {
    const result = parser.parseJSXElement(jsx`<Say>Hi</Say>`);
    expect(result).toBeInstanceOf(CompositeMessage);
    expect((result as CompositeMessage).children[0]).toEqual(new LiteralMessage('Hi'));
  });

  it('delegates to opening parser for self-closing Say.plural', () => {
    const result = parser.parseJSXElement(jsx`<Say.plural _={n} one="item" />`);
    expect((result as CompositeMessage).children[0]).toBeInstanceOf(ChoiceMessage);
  });

  it('returns null (no fallback) for unrecognised element', () => {
    expect(parser.parseJSXElement(jsx`<span />`)).toBeNull();
  });

  it('returns ElementMessage (fallback=true) for unrecognised self-closing element', () => {
    expect(parser.parseJSXElement(jsx`<br />`, true)).toBeInstanceOf(ElementMessage);
  });

  it('returns ElementMessage (fallback=true) for unrecognised container element', () => {
    expect(parser.parseJSXElement(jsx`<span>text</span>`, true)).toBeInstanceOf(ElementMessage);
  });

  describe('say-tag', () => {
    it('names a container element after its tag', () => {
      const result = parser.parseJSXElement(jsx`<a say-tag="link">here</a>`, true);
      expect((result as ElementMessage).identifier).toBe('link');
    });

    it('names a self-closing element after its tag', () => {
      const result = parser.parseJSXElement(jsx`<ChevronDown say-tag="icon" />`, true);
      expect((result as ElementMessage).identifier).toBe('icon');
    });

    it('strips the attribute so it never reaches the rendered element', () => {
      const element = jsx`<a href="/x" say-tag="link">here</a>`;
      const result = parser.parseJSXElement(element, true) as ElementMessage;
      const attributes = (result.expression as t.JSXElement).openingElement.attributes;
      expect(attributes.map((a) => ((a as t.JSXAttribute).name as t.JSXIdentifier).name)).toEqual([
        'href',
      ]);
    });

    it('accepts a string literal in an expression container', () => {
      const element = jsx`<a href="/x" say-tag={'link'}>here</a>`;
      const result = parser.parseJSXElement(element, true) as ElementMessage;
      expect(result.identifier).toBe('link');
      // The attribute is consumed just as the bare-literal form is.
      const attributes = (result.expression as t.JSXElement).openingElement.attributes;
      expect(attributes.map((a) => ((a as t.JSXAttribute).name as t.JSXIdentifier).name)).toEqual([
        'href',
      ]);
    });

    it('ignores a tag that is not a static string', () => {
      const element = jsx`<a say-tag={name}>here</a>`;
      const result = parser.parseJSXElement(element, true) as ElementMessage;
      expect(result.identifier).toBe(AUTO_INCREMENT_IDENTIFIER);
      // A dynamic value is left alone rather than silently dropped.
      expect((result.expression as t.JSXElement).openingElement.attributes).toHaveLength(1);
    });

    it('falls back to auto-increment when there is no tag', () => {
      const result = parser.parseJSXElement(jsx`<a href="/x">here</a>`, true);
      expect((result as ElementMessage).identifier).toBe(AUTO_INCREMENT_IDENTIFIER);
    });

    it('throws for a tag that is not a valid identifier', () => {
      expect(() => parser.parseJSXElement(jsx`<a say-tag="my link">here</a>`, true)).toThrow(
        "Invalid 'say-tag' value 'my link'",
      );
    });

    it('names elements nested inside a Say container', () => {
      const result = parser.parseJSXContainerElement(
        jsx`<Say>Click <a say-tag="link">here</a></Say>`,
      );
      expect((result!.children[1] as ElementMessage).identifier).toBe('link');
    });
  });
});

describe('isEquivalentElement', () => {
  // The children differ throughout: they come from the translation, so they
  // never make two elements distinguishable.
  it('treats elements with the same name and props as equivalent', () => {
    expect(
      parser.isEquivalentElement(jsx`<b className="x">a</b>`, jsx`<b className="x">c</b>`),
    ).toBe(true);
  });

  it('treats differing props as distinguishable', () => {
    expect(parser.isEquivalentElement(jsx`<a href="/x">a</a>`, jsx`<a href="/y">a</a>`)).toBe(
      false,
    );
  });

  it('treats differing element names as distinguishable', () => {
    expect(parser.isEquivalentElement(jsx`<b>a</b>`, jsx`<i>a</i>`)).toBe(false);
  });

  it('treats a self-closing element as distinct from a container', () => {
    expect(parser.isEquivalentElement(jsx`<Icon />`, jsx`<Icon>a</Icon>`)).toBe(false);
  });

  it('treats a non-element expression as distinguishable', () => {
    expect(parser.isEquivalentElement(null, jsx`<b>a</b>`)).toBe(false);
  });
});
