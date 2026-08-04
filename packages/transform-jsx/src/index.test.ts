import { describe, expect, it } from 'vitest';
import createJsxTransformer from './index.js';

const transformer = createJsxTransformer();

describe('createJsxTransformer.match', () => {
  it('matches JSX and TSX extensions', () => {
    expect(transformer.match('file.jsx')).toBe(true);
    expect(transformer.match('file.tsx')).toBe(true);
  });

  it('does not match other extensions', () => {
    for (const ext of ['.js', '.ts', '.json', '.css']) {
      expect(transformer.match(`file${ext}`)).toBe(false);
    }
  });
});

describe('createJsxTransformer.extract', () => {
  it('extracts a JSX Say element', () => {
    const messages = transformer.extract(
      'const x = <Say id="greeting">Hello, {name}!</Say>;',
      'file.tsx',
    );
    const message = messages.find((m) => m.id === 'greeting');
    expect(message).toBeDefined();
    expect(message!.message).toContain('Hello');
    expect(message!.references).toEqual(['file.tsx:1']);
  });

  it('extracts a JSX choice element reference', () => {
    const [message] = transformer.extract(
      'const x = <Say.Plural _={count} one="# item" other="# items" />;',
      'file.tsx',
    );
    expect(message!.message).toBe(`{count, plural,
  one {# item}
  other {# items}
}`);
    expect(message!.references).toEqual(['file.tsx:1']);
  });

  it('extracts a tagged-template message alongside JSX', () => {
    const [message] = transformer.extract('const x = say`Hello, ${name}!`;', 'file.tsx');
    expect(message!.message).toBe('Hello, {name}!');
  });

  it('names placeholders after their say-tag', () => {
    const [message] = transformer.extract(
      'const x = <Say>Click <a href="/x" say-tag="link">here</a> now</Say>;',
      'file.tsx',
    );
    expect(message!.message).toBe('Click <link>here</link> now');
  });

  it('throws when two elements in a message share a tag', () => {
    expect(() =>
      transformer.extract(
        'const x = <Say><b say-tag="bold">a</b> and <i say-tag="bold">c</i></Say>;',
        'file.tsx',
      ),
    ).toThrow("Duplicate element tag 'bold'");
  });

  it('lets identical elements share a tag', () => {
    const [message] = transformer.extract(
      'const x = <Say><b say-tag="bold">a</b> and <b say-tag="bold">c</b></Say>;',
      'file.tsx',
    );
    expect(message!.message).toBe('<bold>a</bold> and <bold>c</bold>');
  });

  it('throws when elements sharing a tag differ in their props', () => {
    expect(() =>
      transformer.extract(
        'const x = <Say><a href="/x" say-tag="link">a</a> and <a href="/y" say-tag="link">c</a></Say>;',
        'file.tsx',
      ),
    ).toThrow("Duplicate element tag 'link'");
  });

  it('names a JSX interpolation written as a single-key object', () => {
    const [message] = transformer.extract(
      'const x = <Say>Hi {{ who: user.name }}</Say>;',
      'file.tsx',
    );
    expect(message!.message).toBe('Hi {who}');
  });

  it('names a choice initialiser written as a single-key object', () => {
    const [message] = transformer.extract(
      'const x = <Say.Plural _={{ items: cart.length }} one="# item" other="# items" />;',
      'file.tsx',
    );
    expect(message!.message).toContain('{items, plural,');
  });

  it('throws for a placeholder name that is not a valid identifier', () => {
    expect(() =>
      transformer.extract("const x = <Say>Hi {{ 'who is': user.name }}</Say>;", 'file.tsx'),
    ).toThrow("Invalid placeholder name 'who is'");
  });

  it('throws for a branch key ICU cannot express', () => {
    expect(() =>
      transformer.extract(
        'const x = <Say.Select _={status} in-stock="In stock" other="Sold out" />;',
        'file.tsx',
      ),
    ).toThrow("Invalid select branch key 'in-stock'");
  });

  it('keeps an underscored numeric branch key an exact match', () => {
    const [message] = transformer.extract(
      'const x = <Say.Plural _={count} _0="none" other="# items" />;',
      'file.tsx',
    );
    expect(message!.message).toContain('=0 {none}');
  });

  it('extracts childless elements as self-closing tags', () => {
    const [message] = transformer.extract('const x = <Say>Open <ChevronDown /></Say>;', 'file.tsx');
    expect(message!.message).toBe('Open <0/>');
  });

  // JSX has no way to write a bare brace in text, so this is the only spelling
  // of one — and it has to reach the catalogue as text rather than as an
  // argument nothing supplies. See `escapeIcuLiteral` in `@saykit/config`.
  it('escapes a literal brace written as an expression', () => {
    const [message] = transformer.extract(
      `const x = <Say>Use {'{'}name{'}'} here</Say>;`,
      'file.tsx',
    );
    expect(message!.message).toBe(`Use '{'name'}' here`);
  });

  it('returns an empty array when there are no messages', () => {
    expect(transformer.extract('const x = <div>plain</div>;', 'file.tsx')).toEqual([]);
  });
});

describe('createJsxTransformer.transform', () => {
  it('rewrites a Say element into a self-closing Say with an id', () => {
    const output = transformer.transform(
      'const x = <Say id="greeting">Hello, {name}!</Say>;',
      'file.tsx',
    );
    expect(output).toContain('id="greeting"');
    expect(output).toContain('_name={name}');
  });

  it('rewrites a tagged template into a `.call`', () => {
    const output = transformer.transform('const x = say`Hello, ${name}!`;', 'file.tsx');
    expect(output).toContain('say.call(');
  });

  it('compiles a tagged element into a named prop without the say-tag attribute', () => {
    const output = transformer.transform(
      'const x = <Say>Click <a href="/x" say-tag="link">here</a></Say>;',
      'file.tsx',
    );
    expect(output).toContain('_link={<a href="/x">here</a>}');
    expect(output).not.toContain('say-tag');
  });

  it('compiles identical elements sharing a tag into a single prop', () => {
    const output = transformer.transform(
      'const x = <Say><b say-tag="bold">a</b> and <b say-tag="bold">c</b></Say>;',
      'file.tsx',
    );
    expect(output.match(/_bold=/g)).toHaveLength(1);
  });

  it('compiles a named interpolation into a prop without its wrapper', () => {
    const output = transformer.transform(
      'const x = <Say>Hi {{ who: user.name }}</Say>;',
      'file.tsx',
    );
    expect(output).toContain('_who={user.name}');
    // The single-key object that named it is gone, not passed as a prop value.
    expect(output).not.toContain('{ who:');
  });

  it('leaves code without messages untouched', () => {
    const output = transformer.transform('const x = <div>plain</div>;', 'file.tsx');
    expect(output).toContain('<div>plain</div>');
  });
});

describe('duplicate placeholder names', () => {
  it('allows the same value interpolated twice', () => {
    const [message] = transformer.extract('<Say>{name} and {name}</Say>', 'file.tsx');
    expect(message!.message).toBe('{name} and {name}');
    const output = transformer.transform('<Say>{name} and {name}</Say>', 'file.tsx');
    expect(output.match(/_name=/g)).toHaveLength(1);
  });

  it('rejects one name given to two different expressions', () => {
    expect(() =>
      transformer.extract('<Say>{{ who: a.name }} and {{ who: b.name }}</Say>', 'file.tsx'),
    ).toThrow("Duplicate placeholder name 'who'");
  });

  it('rejects a value name that collides with an element tag', () => {
    // Tags and values share one namespace in the compiled props, so this stays
    // the harder error it always was.
    expect(() =>
      transformer.extract('<Say>{link} <a say-tag="link">here</a></Say>', 'file.tsx'),
    ).toThrow("Element tag 'link' collides with an argument of the same name");
  });
});
