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

  it('returns an empty array when there are no messages', () => {
    expect(transformer.extract('const x = 1 + 2;', 'file.ts')).toEqual([]);
  });
});

describe('createJsTransformer.transform', () => {
  it('rewrites a tagged template into a `.call`', () => {
    const output = transformer.transform('const greeting = say`Hello, ${name}!`;', 'file.ts');
    expect(output).toContain('say.call(');
    expect(output).toContain('name: name');
    expect(output).not.toContain('say`');
  });

  it('leaves code without messages untouched', () => {
    const output = transformer.transform('const x = 1 + 2;', 'file.ts');
    expect(output).toContain('1 + 2');
    expect(output).not.toContain('.call(');
  });
});
