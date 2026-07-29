import { parseExpression } from '@babel/parser';
import * as t from '@babel/types';
import {
  ArgumentMessage,
  AUTO_INCREMENT_IDENTIFIER,
  ChoiceMessage,
  CompositeMessage,
  LiteralMessage,
} from '@saykit/config/features/messages';
import { describe, expect, it } from 'vitest';
import * as parser from './parser.js';

// Parse a snippet of real source into its expression node, the way the
// transformer does (see index.ts). `test.js` becomes the reference filename.
function expr<T extends t.Expression = t.Expression>(code: string): T {
  return parseExpression(code, {
    sourceFilename: 'test.js',
    plugins: ['typescript'],
  }) as unknown as T;
}

describe('processExpression', () => {
  it('processes a simple `say` identifier', () => {
    const identifier = expr('say');
    expect(parser.processExpression(identifier)).toEqual([identifier, null, null]);
  });

  it('processes `say` with a descriptor object call', () => {
    const call = expr<t.CallExpression>('say({})');
    expect(parser.processExpression(call)).toEqual([call.callee, call.arguments[0], null]);
  });

  it('processes a member expression with a selector', () => {
    const call = expr<t.MemberExpression>('say.plural');
    expect(parser.processExpression(call)).toEqual([call.object, null, 'plural']);
  });

  it('processes a nested member expression with a descriptor', () => {
    const call = expr<t.MemberExpression>('say({}).select');
    const accessor = call.object as t.CallExpression;
    expect(parser.processExpression(call)).toEqual([
      accessor.callee,
      accessor.arguments[0],
      'select',
    ]);
  });

  it('returns null for non-say expressions', () => {
    expect(parser.processExpression(expr('notSay'))).toBeNull();
  });

  it('resolves a say call with too many arguments as a bare accessor', () => {
    const call = expr<t.CallExpression>("say('too', 'many')");
    expect(parser.processExpression(call)).toEqual([call.callee, null, null]);
  });

  it('resolves a computed member whose property is `say`', () => {
    const computed = expr<t.MemberExpression>('foo[say]');
    expect(parser.processExpression(computed)).toEqual([computed, null, null]);
  });

  it('resolves a say call with no arguments', () => {
    const call = expr<t.CallExpression>('say()');
    expect(parser.processExpression(call)).toEqual([call.callee, null, null]);
  });

  it('returns null for a call whose callee does not resolve', () => {
    expect(parser.processExpression(expr('notSay()'))).toBeNull();
  });
});

describe('parseTaggedTemplateExpression', () => {
  it('parses a simple tagged template', () => {
    const result = parser.parseTaggedTemplateExpression(expr('say`Hello`'));
    expect(result).not.toBeNull();
    expect(result!.children).toHaveLength(1);
    expect(result!.children[0]).toEqual({ text: 'Hello' });
  });

  it('parses a tagged template with expressions', () => {
    const result = parser.parseTaggedTemplateExpression(expr('say`Hello ${name}!`'));
    expect(result).not.toBeNull();
    expect(result!.children).toHaveLength(3);
    expect(result!.children[0]).toBeInstanceOf(LiteralMessage);
    expect(result!.children[0]).toEqual({ text: 'Hello ' });
    expect(result!.children[1]).toBeInstanceOf(ArgumentMessage);
    expect((result!.children[1] as ArgumentMessage).identifier).toBe('name');
    expect(result!.children[2]).toBeInstanceOf(LiteralMessage);
    expect(result!.children[2]).toEqual({ text: '!' });
  });

  it('parses a tagged template with a descriptor id', () => {
    const result = parser.parseTaggedTemplateExpression(expr("say({ id: 'greeting' })`Hello`"));
    expect(result).not.toBeNull();
    expect(result!.descriptor).toEqual({ id: 'greeting', context: undefined });
  });

  it('parses a tagged template with a context descriptor', () => {
    const result = parser.parseTaggedTemplateExpression(
      expr("say({ context: 'greeting' })`Hello`"),
    );
    expect(result).not.toBeNull();
    expect(result!.descriptor).toEqual({ id: undefined, context: 'greeting' });
  });

  it('extracts translator comments', () => {
    const tag = expr<t.TaggedTemplateExpression>(
      '// Translators: Use formal greeting\n/* Translators: Consider cultural context */\nsay`Hello`',
    );
    const result = parser.parseTaggedTemplateExpression(tag);
    expect(result).not.toBeNull();
    expect(result!.comments).toEqual(['Use formal greeting', 'Consider cultural context']);
  });

  it('includes location information', () => {
    const result = parser.parseTaggedTemplateExpression(expr('say`Hello`'));
    expect(result).not.toBeNull();
    expect(result!.references).toEqual(['test.js:1']);
  });

  it('omits references when the node has no location', () => {
    const tag = expr<t.TaggedTemplateExpression>('say`Hello`');
    tag.loc = null;
    expect(parser.parseTaggedTemplateExpression(tag)!.references).toEqual([]);
  });

  it('returns null for non-say tagged templates', () => {
    expect(parser.parseTaggedTemplateExpression(expr('notSay`Hello`'))).toBeNull();
  });

  it('falls back to the raw quasi value when cooked is undefined', () => {
    // An invalid escape leaves `cooked` null, so the raw text is used instead.
    const result = parser.parseTaggedTemplateExpression(expr('say`\\unicode`'));
    expect(result!.children[0]).toEqual({ text: '\\unicode' });
  });

  it('ignores non-translator leading comments', () => {
    const result = parser.parseTaggedTemplateExpression(expr('// just a note\nsay`Hi`'));
    expect(result!.comments).toEqual([]);
  });
});

describe('parseCallExpression', () => {
  it('parses a simple plural call expression', () => {
    const result = parser.parseCallExpression(
      expr("say.plural(count, { one: 'item', other: 'items' })"),
    );
    expect(result).not.toBeNull();
    expect(result!.children).toHaveLength(1);
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice).toBeInstanceOf(ChoiceMessage);
    expect(choice.kind).toBe('plural');
    expect(choice.identifier).toBe('count');
    expect(choice.branches).toHaveLength(2);
    expect(choice.branches[0]!.identifier).toBe('one');
    expect(choice.branches[0]!.value).toEqual({ text: 'item' });
    expect(choice.branches[1]!.identifier).toBe('other');
    expect(choice.branches[1]!.value).toEqual({ text: 'items' });
  });

  it('parses an ordinal call expression', () => {
    const result = parser.parseCallExpression(
      expr("say.ordinal(position, { 1: 'first', 2: 'second', other: 'other' })"),
    );
    expect(result).not.toBeNull();
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice).toBeInstanceOf(ChoiceMessage);
    expect(choice.kind).toBe('ordinal');
    expect(choice.identifier).toBe('position');
    expect(choice.branches).toHaveLength(3);
    expect(choice.branches[0]!.identifier).toBe('1');
    expect(choice.branches[0]!.value).toEqual({ text: 'first' });
    expect(choice.branches[1]!.identifier).toBe('2');
    expect(choice.branches[1]!.value).toEqual({ text: 'second' });
    expect(choice.branches[2]!.identifier).toBe('other');
    expect(choice.branches[2]!.value).toEqual({ text: 'other' });
  });

  it('reads string-literal (quoted) choice keys', () => {
    const result = parser.parseCallExpression(
      expr("say.plural(count, { 'one': 'item', 'other': 'items' })"),
    );
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice.branches[0]!.identifier).toBe('one');
    expect(choice.branches[1]!.identifier).toBe('other');
  });

  it('omits references when the node has no location', () => {
    const call = expr<t.CallExpression>("say.plural(count, { other: 'x' })");
    call.loc = null;
    expect(parser.parseCallExpression(call)!.references).toEqual([]);
  });

  it('parses a select call expression', () => {
    const result = parser.parseCallExpression(
      expr("say.select(gender, { male: 'He', female: 'She', other: 'They' })"),
    );
    expect(result).not.toBeNull();
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice).toBeInstanceOf(ChoiceMessage);
    expect(choice.kind).toBe('select');
    expect(choice.identifier).toBe('gender');
    expect(choice.branches).toHaveLength(3);
    expect(choice.branches[0]!.identifier).toBe('male');
    expect(choice.branches[0]!.value).toEqual({ text: 'He' });
    expect(choice.branches[1]!.identifier).toBe('female');
    expect(choice.branches[1]!.value).toEqual({ text: 'She' });
    expect(choice.branches[2]!.identifier).toBe('other');
    expect(choice.branches[2]!.value).toEqual({ text: 'They' });
  });

  it('parses choices with nested expressions', () => {
    const result = parser.parseCallExpression(expr('say.plural(count, { one: name })'));
    expect(result).not.toBeNull();
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice).toBeInstanceOf(ChoiceMessage);
    expect(choice.kind).toBe('plural');
    expect(choice.identifier).toBe('count');
    expect(choice.branches).toHaveLength(1);
    expect(choice.branches[0]!.identifier).toBe('one');
    expect(choice.branches[0]!.value).toBeInstanceOf(ArgumentMessage);
    expect((choice.branches[0]!.value as ArgumentMessage).identifier).toBe('name');
  });

  it('parses choices with a descriptor', () => {
    const result = parser.parseCallExpression(
      expr("say({ id: 'itemCount' }).plural(count, { one: 'item', other: 'items' })"),
    );
    expect(result).not.toBeNull();
    expect(result!.descriptor).toEqual({ id: 'itemCount', context: undefined });
  });

  it('returns null for non-choice call expressions', () => {
    expect(parser.parseCallExpression(expr('say.something()'))).toBeNull();
  });

  it('returns null for malformed choice expressions', () => {
    expect(parser.parseCallExpression(expr('say.plural()'))).toBeNull();
  });

  it('handles bigint identifiers as exact matches', () => {
    const result = parser.parseCallExpression(
      expr("say.plural(count, { 1n: 'one', other: 'many' })"),
    );
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice.branches[0]!.identifier).toBe('1');
  });

  it('falls back to the auto-increment identifier for computed keys', () => {
    const result = parser.parseCallExpression(
      expr("say.plural(count, { [a.b]: 'x', other: 'many' })"),
    );
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice.branches[0]!.identifier).toBe(AUTO_INCREMENT_IDENTIFIER);
  });

  it('handles numeric identifiers as exact matches', () => {
    const result = parser.parseCallExpression(
      expr("say.plural(count, { 0: 'none', 1: 'one', other: 'many' })"),
    );
    expect(result).not.toBeNull();
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice).toBeInstanceOf(ChoiceMessage);
    expect(choice.kind).toBe('plural');
    expect(choice.identifier).toBe('count');
    expect(choice.branches).toHaveLength(3);
    expect(choice.branches[0]!.identifier).toBe('0');
    expect(choice.branches[0]!.value).toEqual({ text: 'none' });
    expect(choice.branches[1]!.identifier).toBe('1');
    expect(choice.branches[1]!.value).toEqual({ text: 'one' });
    expect(choice.branches[2]!.identifier).toBe('other');
    expect(choice.branches[2]!.value).toEqual({ text: 'many' });
  });

  it('returns null when the callee is not a say expression', () => {
    expect(parser.parseCallExpression(expr("other.plural(count, { other: 'x' })"))).toBeNull();
  });

  it('returns null when the first argument is not an expression', () => {
    expect(parser.parseCallExpression(expr("say.plural(...args, { other: 'x' })"))).toBeNull();
  });

  it('returns null when the second argument is not an object', () => {
    expect(parser.parseCallExpression(expr('say.plural(count, notObject)'))).toBeNull();
  });

  it('skips choice properties that are not plain object properties', () => {
    const result = parser.parseCallExpression(expr("say.plural(count, { ...rest, other: 'x' })"));
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice.branches).toHaveLength(1);
    expect(choice.branches[0]!.identifier).toBe('other');
  });

  it('ignores descriptor spread properties when reading id/context', () => {
    const result = parser.parseCallExpression(
      expr("say({ ...rest, id: 'kept' }).plural(count, { other: 'x' })"),
    );
    expect(result!.descriptor).toEqual({ id: 'kept', context: undefined });
  });
});

describe('parseExpression', () => {
  it('delegates to the tagged template parser', () => {
    const result = parser.parseExpression(expr('say`Hello`'));
    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(CompositeMessage);
  });

  it('delegates to the call expression parser', () => {
    const result = parser.parseExpression(
      expr("say.plural(count, { one: 'item', other: 'items' })"),
    );
    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(CompositeMessage);
  });

  it('returns an argument message for fallback=true with a simple identifier', () => {
    const result = parser.parseExpression(expr('name'), true);
    expect(result).toBeInstanceOf(ArgumentMessage);
    expect((result as ArgumentMessage).identifier).toBe('name');
  });

  it('returns an argument message for fallback=true with a complex expression', () => {
    const result = parser.parseExpression(expr('obj.prop'), true);
    expect(result).toBeInstanceOf(ArgumentMessage);
    expect((result as ArgumentMessage).identifier).toBe(AUTO_INCREMENT_IDENTIFIER);
  });

  it('returns null for fallback=false with a non-say expression', () => {
    expect(parser.parseExpression(expr('name'), false)).toBeNull();
  });

  it('handles nested expressions in tagged templates', () => {
    const result = parser.parseExpression(expr('say`Hello ${user.name}!`'));
    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(CompositeMessage);
    expect(result!.children).toHaveLength(3);
    expect(result!.children[1]).toBeInstanceOf(ArgumentMessage);
    expect((result!.children[1] as ArgumentMessage).identifier).toBe(AUTO_INCREMENT_IDENTIFIER);
  });
});

describe('unwrapPlaceholder', () => {
  it('names a value written as a single-key object', () => {
    const object = expr<t.ObjectExpression>('({ cartTotal: getTotal() })');
    const property = object.properties[0] as t.ObjectProperty;
    expect(parser.unwrapPlaceholder(object)).toEqual(['cartTotal', property.value]);
  });

  it('names a template interpolation the value would otherwise number', () => {
    const result = parser.parseExpression(expr('say`Total: ${{ cartTotal: getTotal() }}`'));
    const argument = result!.children[1] as ArgumentMessage;
    expect(argument.identifier).toBe('cartTotal');
    // The wrapper is gone, only the value it held is compiled.
    expect(t.isCallExpression(argument.expression)).toBe(true);
    expect(((argument.expression as t.CallExpression).callee as t.Identifier).name).toBe(
      'getTotal',
    );
  });

  it('accepts a quoted key and a shorthand property', () => {
    expect(parser.unwrapPlaceholder(expr("({ 'cartTotal': x })"))[0]).toBe('cartTotal');
    expect(parser.unwrapPlaceholder(expr('({ total })'))[0]).toBe('total');
  });

  it.each([
    ['a name that is not a valid identifier', "({ 'cart-total': x })"],
    ['a numeric name', '({ 0: x })'],
  ])('throws for %s', (_, code) => {
    expect(() => parser.unwrapPlaceholder(expr(code))).toThrow('Invalid placeholder name');
  });

  it.each([
    ['more than one key', '({ a: 1, b: 2 })'],
    ['no keys', '({})'],
    ['a computed key', '({ [key]: x })'],
    ['a spread', '({ ...rest })'],
    ['a method', '({ a() {} })'],
  ])('leaves an object with %s untouched', (_, code) => {
    // Only the one shape that could not already mean something is claimed.
    const object = expr<t.ObjectExpression>(code);
    expect(parser.unwrapPlaceholder(object)).toEqual([AUTO_INCREMENT_IDENTIFIER, object]);
  });

  it('passes a plain expression through as it always was', () => {
    const identifier = expr('name');
    expect(parser.unwrapPlaceholder(identifier)).toEqual(['name', identifier]);
    const member = expr('obj.prop');
    expect(parser.unwrapPlaceholder(member)).toEqual([AUTO_INCREMENT_IDENTIFIER, member]);
  });

  it('names a choice selector', () => {
    const result = parser.parseExpression(
      expr("say.plural({ n: items.length }, { one: '# item', other: '# items' })"),
    );
    const choice = result!.children[0] as ChoiceMessage;
    expect(choice.identifier).toBe('n');
    expect(t.isMemberExpression(choice.expression)).toBe(true);
  });

  it('keeps a named `say` macro a message of its own', () => {
    const result = parser.parseExpression(expr('say`Hi ${{ nested: say`there` }}`'));
    // The name is dropped rather than applied to a nested message, but no macro
    // survives into the output.
    expect(result!.children[1]).toBeInstanceOf(CompositeMessage);
  });
});

describe('isEquivalentPlaceholder, on values', () => {
  it('treats the same variable interpolated twice as one value', () => {
    expect(parser.isEquivalentPlaceholder(expr('name'), expr('name'))).toBe(true);
  });

  it('treats the same member chain written twice as one value', () => {
    expect(parser.isEquivalentPlaceholder(expr('author.name'), expr('author.name'))).toBe(true);
  });

  it('treats a variable and a member chain as distinguishable', () => {
    // The shape `${name}` beside `${{ name: author.name }}` reduces to.
    expect(parser.isEquivalentPlaceholder(expr('name'), expr('author.name'))).toBe(false);
  });

  it('treats different member chains as distinguishable', () => {
    expect(parser.isEquivalentPlaceholder(expr('items.length'), expr('users.length'))).toBe(false);
  });

  it('ignores where in the source each one was written', () => {
    // The same expression written at two points in a message parses to nodes
    // that differ in position, which must not make them two placeholders.
    const a = expr('cart.total');
    const b = expr('  cart.total');
    expect(a.start).not.toBe(b.start);
    expect(parser.isEquivalentPlaceholder(a, b)).toBe(true);
  });

  it('treats anything that is not a node as distinguishable', () => {
    expect(parser.isEquivalentPlaceholder(null, null)).toBe(false);
    expect(parser.isEquivalentPlaceholder(expr('name'), undefined)).toBe(false);
  });
});
