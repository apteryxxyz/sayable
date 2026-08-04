import { describe, expect, it } from 'vitest';
import createJsTransformer from './index.js';

const transformer = createJsTransformer();

describe('createJsTransformer.match', () => {
  it('matches JavaScript and TypeScript extensions', () => {
    for (const ext of ['.js', '.cjs', '.mjs', '.ts', '.mts', '.cts']) {
      expect(transformer.match(`file${ext}`)).toBe(true);
    }
  });

  it('does not match other extensions', () => {
    for (const ext of ['.jsx', '.tsx', '.json', '.css']) {
      expect(transformer.match(`file${ext}`)).toBe(false);
    }
  });
});

describe('createJsTransformer.extract', () => {
  it('extracts a tagged-template message', () => {
    const [message] = transformer.extract('const greeting = say`Hello, ${name}!`;', 'file.ts');
    expect(message).toBeDefined();
    expect(message!.message).toBe('Hello, {name}!');
    expect(message!.id).toBeUndefined();
    expect(message!.references).toEqual(['file.ts:1']);
  });

  // A brace in a template is text — the template's own interpolation is `${}`,
  // so nothing here is asking for an ICU argument. Escaping it is what keeps a
  // message from turning into a placeholder the catalogue never declared.
  it('escapes a brace written in a template', () => {
    const [message] = transformer.extract('const x = say`Use {name} here`;', 'file.ts');
    expect(message!.message).toBe(`Use '{'name'}' here`);
  });

  it('carries through an explicit id and context', () => {
    const [message] = transformer.extract(
      "const g = say({ id: 'greeting', context: 'formal' })`Hi`;",
      'file.ts',
    );
    expect(message!.id).toBe('greeting');
    expect(message!.context).toBe('formal');
  });

  it('extracts choice (plural) calls', () => {
    const [message] = transformer.extract(
      "const c = say.plural(count, { one: '# item', other: '# items' });",
      'file.ts',
    );
    expect(message!.message).toContain('plural');
  });

  it('names a placeholder written as a single-key object', () => {
    const [message] = transformer.extract(
      'const t = say`Total: ${{ cartTotal: getTotal() }}`;',
      'file.ts',
    );
    expect(message!.message).toBe('Total: {cartTotal}');
  });

  it('leaves unnamed placeholders numbered alongside named ones', () => {
    const [message] = transformer.extract('const t = say`${{ total: a.b }} ${c.d}`;', 'file.ts');
    expect(message!.message).toBe('{total} {0}');
  });

  it('throws for a name that is not a valid identifier', () => {
    expect(() => transformer.extract("const t = say`${{ 'cart total': x }}`;", 'file.ts')).toThrow(
      "Invalid placeholder name 'cart total'",
    );
  });

  it('throws for a branch key ICU cannot express', () => {
    expect(() =>
      transformer.extract(
        "const s = say.select(status, { 'sold-out': 'Sold out', other: 'In stock' });",
        'file.ts',
      ),
    ).toThrow("Invalid select branch key 'sold-out', an ICU key cannot contain punctuation");
  });

  it('returns an empty array when there are no messages', () => {
    expect(transformer.extract('const x = 1 + 2;', 'file.ts')).toEqual([]);
  });
});

describe('createJsTransformer.transform', () => {
  it('rewrites a tagged template into a `.call`', () => {
    const output = transformer.transform('const greeting = say`Hello, ${name}!`;', 'file.ts');
    expect(output).toContain('say.call(');
    expect(output).toContain('_name: name');
    expect(output).not.toContain('say`');
  });

  it('keeps a value named `id` from displacing the message id', () => {
    const output = transformer.transform('const g = say`Hi ${id}`;', 'file.ts');
    // Both are properties of one object, so without the prefix the value would
    // win and the descriptor would no longer name a message.
    expect(output).toMatch(/id: "[^"]+"/);
    expect(output).toContain('_id: id');
  });

  it('compiles a named placeholder without its wrapper', () => {
    const output = transformer.transform(
      'const t = say`Total: ${{ cartTotal: getTotal() }}`;',
      'file.ts',
    );
    expect(output).toContain('_cartTotal: getTotal()');
    // The single-key object that named it is gone, not nested inside the call.
    expect(output).not.toContain('{ cartTotal:');
  });

  it('throws for a name that is not a valid identifier', () => {
    expect(() =>
      transformer.transform("const t = say`${{ 'cart total': x }}`;", 'file.ts'),
    ).toThrow("Invalid placeholder name 'cart total'");
  });

  it('leaves code without messages untouched', () => {
    const output = transformer.transform('const x = 1 + 2;', 'file.ts');
    expect(output).toContain('1 + 2');
    expect(output).not.toContain('.call(');
  });
});

describe('duplicate placeholder names', () => {
  it('allows the same value interpolated twice', () => {
    const [message] = transformer.extract('const t = say`${name} and ${name}`;', 'file.ts');
    expect(message!.message).toBe('{name} and {name}');
    // One name is one value, so the repeat compiles to a single property.
    const output = transformer.transform('const t = say`${name} and ${name}`;', 'file.ts');
    expect(output.match(/_name:/g)).toHaveLength(1);
  });

  it('allows two named placeholders that name the same expression', () => {
    const code = 'const t = say`${{ name: author.name }} and ${{ name: author.name }}`;';
    expect(transformer.extract(code, 'file.ts')[0]!.message).toBe('{name} and {name}');
    expect(transformer.transform(code, 'file.ts').match(/_name:/g)).toHaveLength(1);
  });

  it('rejects one name given to two different expressions', () => {
    expect(() =>
      transformer.extract(
        'const t = say`${{ n: items.length }} ${{ n: users.length }}`;',
        'file.ts',
      ),
    ).toThrow(
      "Duplicate placeholder name 'n', give each value in a message its own name unless they are identical",
    );
  });

  it('rejects a name that collides with a variable interpolated directly', () => {
    expect(() =>
      transformer.transform('const t = say`${name} ${{ name: author.name }}`;', 'file.ts'),
    ).toThrow("Duplicate placeholder name 'name'");
  });

  it('compares a choice selector against the values around it', () => {
    expect(() =>
      transformer.extract(
        "const t = say`${count} ${say.plural({ count: items.length }, { other: '#' })}`;",
        'file.ts',
      ),
    ).toThrow("Duplicate placeholder name 'count'");
  });
});
