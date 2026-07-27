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
    expect(output).toContain('name={name}');
  });

  it('rewrites a tagged template into a `.call`', () => {
    const output = transformer.transform('const x = say`Hello, ${name}!`;', 'file.tsx');
    expect(output).toContain('say.call(');
  });

  it('leaves code without messages untouched', () => {
    const output = transformer.transform('const x = <div>plain</div>;', 'file.tsx');
    expect(output).toContain('<div>plain</div>');
  });
});
