import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { transformSync } from '@babel/core';
import { generateHash } from '@saykit/config/features/messages';
import { afterAll, describe, expect, it, vi } from 'vitest';

const config = {
  buckets: [
    {
      match: (id: string) => id.endsWith('.ts'),
      output: { match: (id: string) => id.endsWith('.json') },
      transformer: { transform: (code: string) => code.replace('MARK', 'DONE') },
      formatter: {
        parse: (content: string) =>
          JSON.parse(content) as { message: string; translation?: string; id?: string }[],
      },
    },
  ],
};

vi.mock('@saykit/config/features/loader', () => ({ resolveConfig: () => config }));

const { default: plugin } = await import('./index.js');

const dir = mkdtempSync(join(tmpdir(), 'saykit-babel-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const run = (code: string, filename: string) =>
  transformSync(code, { filename, plugins: [plugin], babelrc: false, configFile: false })!.code!;

describe('plugin-babel parserOverride', () => {
  it('runs the bucket transformer over matching source files', () => {
    const out = run('const x = "MARK";', join(dir, 'app.ts'));
    expect(out).toContain('DONE');
  });

  it('skips files inside node_modules', () => {
    const out = run('const x = "MARK";', join(dir, 'node_modules', 'dep', 'index.ts'));
    expect(out).toContain('MARK');
  });

  it('leaves source files that match no bucket unchanged', () => {
    const out = run('const x = "MARK";', join(dir, 'app.js'));
    expect(out).toContain('MARK');
  });
});

describe('plugin-babel inline imports', () => {
  it('replaces a default import of a catalogue with an inlined record', () => {
    const cat = join(dir, 'messages.json');
    writeFileSync(
      cat,
      JSON.stringify([
        { message: 'Hello', translation: 'Bonjour', id: 'greeting' },
        { message: 'Bye', translation: '' },
      ]),
    );
    const out = run(`import m from './messages.json';\nexport default m;`, join(dir, 'app.ts'));
    expect(out).toContain('greeting');
    expect(out).toContain('Bonjour');
    // No id + empty translation -> hashed key with the source text.
    expect(out).toContain(generateHash('Bye', undefined));
  });

  it('ignores bare (non-relative) imports', () => {
    const out = run(`import x from 'some-pkg';\nx;`, join(dir, 'app.ts'));
    expect(out).toContain("'some-pkg'");
  });

  it('ignores relative imports that are not bucket outputs', () => {
    const out = run(`import x from './helper.ts';\nx;`, join(dir, 'app.ts'));
    expect(out).toContain('./helper.ts');
  });

  it('ignores imports when the file has no name', () => {
    const out = transformSync(`import x from './messages.json';\nx;`, {
      plugins: [plugin],
      babelrc: false,
      configFile: false,
    })!.code!;
    expect(out).toContain('./messages.json');
  });

  it('throws for a non-default import of a catalogue', () => {
    writeFileSync(join(dir, 'm2.json'), JSON.stringify([]));
    expect(() => run(`import { x } from './m2.json';\nx;`, join(dir, 'app.ts'))).toThrow(
      'SayKit inline imports require a default import',
    );
  });
});
