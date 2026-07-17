import * as t from '@babel/types';
import {
  ArgumentMessage,
  ChoiceMessage,
  CompositeMessage,
  ElementMessage,
  LiteralMessage,
} from '@saykit/config/features/messages';
import { describe, expect, it } from 'vitest';
import * as parser from './parser.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSayContainer(
  children: (
    | t.JSXElement
    | t.JSXExpressionContainer
    | t.JSXFragment
    | t.JSXSpreadChild
    | t.JSXText
  )[],
  attrs: t.JSXAttribute[] = [],
) {
  const id = t.jsxIdentifier('Say');
  return t.jsxElement(t.jsxOpeningElement(id, attrs, false), t.jsxClosingElement(id), children);
}

function makeSaySelfClosing(kind: string, attrs: t.JSXAttribute[]) {
  const name = t.jsxMemberExpression(t.jsxIdentifier('Say'), t.jsxIdentifier(kind));
  return t.jsxOpeningElement(name, attrs, true);
}

function attr(name: string, value: t.JSXAttribute['value']) {
  return t.jsxAttribute(t.jsxIdentifier(name), value);
}

function exprAttr(name: string, expr: t.Expression) {
  return attr(name, t.jsxExpressionContainer(expr));
}

function strAttr(name: string, value: string) {
  return attr(name, t.stringLiteral(value));
}

// ─── parseJSXContainerElement ────────────────────────────────────────────────

describe('parseJSXContainerElement', () => {
  it('returns null for self-closing elements', () => {
    const id = t.jsxIdentifier('Say');
    const el = t.jsxElement(t.jsxOpeningElement(id, [], true), null, []);
    expect(parser.parseJSXContainerElement(el)).toBeNull();
  });

  it('returns null for non-Say elements', () => {
    const id = t.jsxIdentifier('div');
    const el = t.jsxElement(t.jsxOpeningElement(id, [], false), t.jsxClosingElement(id), []);
    expect(parser.parseJSXContainerElement(el)).toBeNull();
  });

  it('parses text children as LiteralMessage', () => {
    const result = parser.parseJSXContainerElement(makeSayContainer([t.jsxText('Hello')]));
    expect(result).toBeInstanceOf(CompositeMessage);
    expect(result!.children[0]).toEqual(new LiteralMessage('Hello'));
  });

  it('normalises whitespace in text children', () => {
    const result = parser.parseJSXContainerElement(
      makeSayContainer([t.jsxText('\n  Hello,  \n  world!  \n')]),
    );
    expect((result!.children[0] as LiteralMessage).text).toBe('Hello, world!');
  });

  it('parses expression children as ArgumentMessage', () => {
    const result = parser.parseJSXContainerElement(
      makeSayContainer([t.jsxExpressionContainer(t.identifier('name'))]),
    );
    expect(result!.children[0]).toBeInstanceOf(ArgumentMessage);
    expect((result!.children[0] as ArgumentMessage).identifier).toBe('name');
  });

  it('parses fragment children as ElementMessage', () => {
    const fragment = t.jsxFragment(t.jsxOpeningFragment(), t.jsxClosingFragment(), []);
    const result = parser.parseJSXContainerElement(makeSayContainer([fragment]));
    expect(result!.children[0]).toBeInstanceOf(ElementMessage);
  });

  it('parses nested JSX children as ElementMessage (non-Say fallback)', () => {
    const inner = t.jsxIdentifier('strong');
    const nested = t.jsxElement(t.jsxOpeningElement(inner, [], false), t.jsxClosingElement(inner), [
      t.jsxText('bold'),
    ]);
    const result = parser.parseJSXContainerElement(makeSayContainer([nested]));
    expect(result!.children[0]).toBeInstanceOf(ElementMessage);
  });

  it('reads id and context descriptor attributes', () => {
    const result = parser.parseJSXContainerElement(
      makeSayContainer([t.jsxText('Hi')], [strAttr('id', 'msg'), strAttr('context', 'nav')]),
    );
    expect(result!.descriptor).toEqual({ id: 'msg', context: 'nav' });
  });

  it('leaves descriptor fields undefined when attributes are absent', () => {
    const result = parser.parseJSXContainerElement(makeSayContainer([t.jsxText('Hi')]));
    expect(result!.descriptor).toEqual({ id: undefined, context: undefined });
  });

  it('leaves whitespace undefined when the attribute is absent', () => {
    const result = parser.parseJSXContainerElement(makeSayContainer([t.jsxText('Hi')]));
    expect(result!.whitespace).toBeUndefined();
  });

  it('reads whitespace={false} attribute as a boolean', () => {
    const result = parser.parseJSXContainerElement(
      makeSayContainer([t.jsxText('Hi')], [exprAttr('whitespace', t.booleanLiteral(false))]),
    );
    expect(result!.whitespace).toBe(false);
  });

  it('treats a bare whitespace attribute as true', () => {
    const result = parser.parseJSXContainerElement(
      makeSayContainer([t.jsxText('Hi')], [attr('whitespace', null)]),
    );
    expect(result!.whitespace).toBe(true);
  });
});

// ─── parseJSXOpeningElement ──────────────────────────────────────────────────

describe('parseJSXOpeningElement', () => {
  it('returns null for non-self-closing elements', () => {
    const el = t.jsxOpeningElement(t.jsxIdentifier('Say'), [], false);
    expect(parser.parseJSXOpeningElement(el)).toBeNull();
  });

  it('returns null for non-Say elements', () => {
    const el = t.jsxOpeningElement(t.jsxIdentifier('div'), [], true);
    expect(parser.parseJSXOpeningElement(el)).toBeNull();
  });

  it('returns null for unknown Say member (e.g. Say.foo)', () => {
    const el = makeSaySelfClosing('foo', []);
    expect(parser.parseJSXOpeningElement(el)).toBeNull();
  });

  it('returns null when _ initialiser attribute is missing', () => {
    const el = makeSaySelfClosing('plural', [strAttr('one', 'item')]);
    expect(parser.parseJSXOpeningElement(el)).toBeNull();
  });

  it('parses Say.plural with string literal branches', () => {
    const el = makeSaySelfClosing('plural', [
      exprAttr('_', t.identifier('count')),
      strAttr('one', 'item'),
      strAttr('other', 'items'),
    ]);
    const result = parser.parseJSXOpeningElement(el);
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
    for (const kind of ['select', 'ordinal'] as const) {
      const el = makeSaySelfClosing(kind, [exprAttr('_', t.identifier('val')), strAttr('a', 'A')]);
      const result = parser.parseJSXOpeningElement(el);
      expect((result!.children[0] as ChoiceMessage).kind).toBe(kind);
    }
  });

  it('strips leading underscore from numeric branch names (e.g. _0 → 0)', () => {
    const el = makeSaySelfClosing('plural', [
      exprAttr('_', t.identifier('count')),
      strAttr('_0', 'zero'),
      strAttr('other', 'many'),
    ]);
    const choice = parser.parseJSXOpeningElement(el)!.children[0] as ChoiceMessage;
    expect(choice.branches[0]!.identifier).toBe('0');
  });

  it('accepts a JSX element expression as a branch value', () => {
    const inner = t.jsxIdentifier('b');
    const nested = t.jsxElement(t.jsxOpeningElement(inner, [], false), t.jsxClosingElement(inner), [
      t.jsxText('Bold'),
    ]);
    const el = makeSaySelfClosing('plural', [
      exprAttr('_', t.identifier('count')),
      attr('one', t.jsxExpressionContainer(nested)),
    ]);
    const choice = parser.parseJSXOpeningElement(el)!.children[0] as ChoiceMessage;
    expect(choice.branches[0]!.value).toBeInstanceOf(ElementMessage);
  });

  it('accepts a JSX fragment expression as a branch value', () => {
    const fragment = t.jsxFragment(t.jsxOpeningFragment(), t.jsxClosingFragment(), []);
    const el = makeSaySelfClosing('plural', [
      exprAttr('_', t.identifier('count')),
      attr('one', t.jsxExpressionContainer(fragment)),
    ]);
    const choice = parser.parseJSXOpeningElement(el)!.children[0] as ChoiceMessage;
    expect(choice.branches[0]!.value).toBeInstanceOf(ElementMessage);
  });

  it('accepts an expression as a branch value (ArgumentMessage)', () => {
    const el = makeSaySelfClosing('plural', [
      exprAttr('_', t.identifier('count')),
      exprAttr('one', t.identifier('label')),
    ]);
    const choice = parser.parseJSXOpeningElement(el)!.children[0] as ChoiceMessage;
    expect(choice.branches[0]!.value).toBeInstanceOf(ArgumentMessage);
  });

  it('reads id and context descriptor attributes', () => {
    const el = makeSaySelfClosing('plural', [
      strAttr('id', 'item-count'),
      strAttr('context', 'shop'),
      exprAttr('_', t.identifier('count')),
      strAttr('one', 'item'),
    ]);
    expect(parser.parseJSXOpeningElement(el)!.descriptor).toEqual({
      id: 'item-count',
      context: 'shop',
    });
  });
});

// ─── parseJSXElement ─────────────────────────────────────────────────────────

describe('parseJSXElement', () => {
  it('delegates to container parser for non-self-closing Say', () => {
    const result = parser.parseJSXElement(makeSayContainer([t.jsxText('Hi')]));
    expect(result).toBeInstanceOf(CompositeMessage);
    expect((result as CompositeMessage).children[0]).toEqual(new LiteralMessage('Hi'));
  });

  it('delegates to opening parser for self-closing Say.plural', () => {
    const opening = makeSaySelfClosing('plural', [
      exprAttr('_', t.identifier('n')),
      strAttr('one', 'item'),
    ]);
    const el = t.jsxElement(opening, null, []);
    const result = parser.parseJSXElement(el);
    expect((result as CompositeMessage).children[0]).toBeInstanceOf(ChoiceMessage);
  });

  it('returns null (no fallback) for unrecognised element', () => {
    const id = t.jsxIdentifier('span');
    const el = t.jsxElement(t.jsxOpeningElement(id, [], true), null, []);
    expect(parser.parseJSXElement(el)).toBeNull();
  });

  it('returns ElementMessage (fallback=true) for unrecognised self-closing element', () => {
    const id = t.jsxIdentifier('br');
    const el = t.jsxElement(t.jsxOpeningElement(id, [], true), null, []);
    expect(parser.parseJSXElement(el, true)).toBeInstanceOf(ElementMessage);
  });

  it('returns ElementMessage (fallback=true) for unrecognised container element', () => {
    const id = t.jsxIdentifier('span');
    const el = t.jsxElement(t.jsxOpeningElement(id, [], false), t.jsxClosingElement(id), [
      t.jsxText('text'),
    ]);
    expect(parser.parseJSXElement(el, true)).toBeInstanceOf(ElementMessage);
  });
});
