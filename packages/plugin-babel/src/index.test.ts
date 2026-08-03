import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { transformSync } from '@babel/core';
import { generateHash } from '@saykit/config/features/messages';
import { afterAll, describe, expect, it, vi } from 'vitest';

const dir = mkdtempSync(join(tmpdir(), 'saykit-babel-'));

const config = {
  locales: ['en', 'fr'],
  buckets: [
    {
      match: (id: string) => id.endsWith('.ts'),
      output: Object.assign(join(dir, '{locale}.{extension}'), {
        match: (id: string) => id.endsWith('.json'),
      }),
      transformer: { transform: (code: string) => code.replace('MARK', 'DONE') },
      formatter: {
        extension: '.json',
        parse: (content: string) =>
          JSON.parse(content) as { message: string; translation?: string; id?: string }[],
      },
    },
  ],
};

vi.mock('@saykit/config/features/loader', () => ({ resolveConfig: () => config }));

const { default: plugin } = await import('./index.js');
const { loadCatalogue } = await import('./catalogue.js');

afterAll(() => rmSync(dir, { recursive: true, force: true }));

const run = (code: string, filename: string, options: { catalogues?: 'inline' | 'module' } = {}) =>
  transformSync(code, {
    filename,
    plugins: [[plugin, options]],
    babelrc: false,
    configFile: false,
  })!.code!;

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

describe('plugin-babel catalogue imports', () => {
  const source = `import m from './messages.json';\nexport default m;`;

  it('inlines the assembled record by default, so Babel alone is enough', () => {
    writeFileSync(join(dir, 'messages.json'), JSON.stringify([{ message: 'Hello' }]));
    const out = run(source, join(dir, 'app.ts'));
    expect(out).not.toContain('./messages.json');
    expect(out).toContain('Hello');
  });

  // With a bundler integration wired up (see `webpack/index.ts` and
  // `metro/transformer.ts`) the import has to survive — inlining it strips the
  // dependency edge the bundler invalidates on, which is what broke hot reload
  // in https://github.com/k0d13/saykit/issues/71.
  it('leaves the import intact under `catalogues: "module"`', () => {
    writeFileSync(join(dir, 'messages.json'), JSON.stringify([{ message: 'Hello' }]));
    const out = run(source, join(dir, 'app.ts'), { catalogues: 'module' });
    expect(out).toContain('./messages.json');
  });

  it('requires a default import when inlining', () => {
    writeFileSync(join(dir, 'messages.json'), JSON.stringify([{ message: 'Hello' }]));
    expect(() => run(`import { m } from './messages.json';`, join(dir, 'app.ts'))).toThrow(
      'require a default import',
    );
  });
});

describe('loadCatalogue', () => {
  it('assembles a catalogue into a record', async () => {
    writeFileSync(
      join(dir, 'en.json'),
      JSON.stringify([
        { message: 'Hello', translation: 'Hello', id: 'greeting' },
        { message: 'Bye', translation: 'Bye', id: 'farewell' },
      ]),
    );

    const catalogue = await loadCatalogue(config as never, join(dir, 'en.json'));
    expect(catalogue?.record).toMatchObject({ greeting: 'Hello', farewell: 'Bye' });
  });

  it('falls back to the source locale for keys untranslated in another locale', async () => {
    writeFileSync(
      join(dir, 'fr.json'),
      JSON.stringify([{ message: 'Hello', translation: 'Bonjour', id: 'greeting' }]),
    );

    const catalogue = await loadCatalogue(config as never, join(dir, 'fr.json'));
    expect(catalogue?.record).toMatchObject({ greeting: 'Bonjour', farewell: 'Bye' });
    // Every file in the chain is reported so callers can register it for
    // invalidation, not just the locale's own file.
    expect(catalogue?.sources).toHaveLength(2);
  });

  it('hashes a key when the message carries no id', async () => {
    writeFileSync(join(dir, 'm2.json'), JSON.stringify([{ message: 'Bye' }]));
    const catalogue = await loadCatalogue(config as never, join(dir, 'm2.json'));
    expect(catalogue?.record).toHaveProperty(generateHash('Bye', undefined));
  });

  it('ignores a path that is not a catalogue', async () => {
    expect(await loadCatalogue(config as never, join(dir, 'helper.ts'))).toBeUndefined();
  });
});
