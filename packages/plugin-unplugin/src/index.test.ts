import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { generateHash } from '@saykit/config/features/messages';
import { afterAll, describe, expect, it, vi } from 'vitest';

const dir = mkdtempSync(join(tmpdir(), 'saykit-unplugin-'));

const config = {
  locales: ['en', 'en-GB', 'en-NZ', 'fr'],
  fallbackLocales: { 'en-NZ': ['en-GB'] },
  buckets: [
    {
      match: (id: string) => id.endsWith('.ts'),
      output: Object.assign(join(dir, '{locale}', 'messages.{extension}'), {
        match: (id: string) => id.endsWith('messages.json'),
      }),
      transformer: { transform: (code: string) => code.replace('say', 'SAY') },
      formatter: {
        extension: '.json',
        parse: (content: string) =>
          JSON.parse(content) as {
            message: string;
            translation?: string;
            id?: string;
            context?: string;
          }[],
      },
    },
  ],
};

vi.mock('@saykit/config/features/loader', () => ({ resolveConfig: () => config }));

const { default: unplugin } = await import('./index.js');
const plugin = unplugin.raw(undefined, { framework: 'rollup' } as never) as {
  transform: { handler: (code: string, id: string) => string };
  load: { handler: (id: string) => Promise<string | undefined> };
};

afterAll(() => rmSync(dir, { recursive: true, force: true }));

const write = (locale: string, content: unknown) => {
  const file = join(dir, locale, 'messages.json');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
  return file;
};

const record = (output: string | undefined) => JSON.parse(output!.replace('export default ', ''));

describe('unplugin transform', () => {
  it('transforms code for a matching bucket', () => {
    expect(plugin.transform.handler('say`Hi`', join(process.cwd(), 'src/app.ts'))).toBe('SAY`Hi`');
  });

  it('leaves code untouched when no bucket matches', () => {
    expect(plugin.transform.handler('say`Hi`', join(process.cwd(), 'src/app.css'))).toBe('say`Hi`');
  });
});

describe('unplugin load', () => {
  it('loads the source locale into a default-exported record', async () => {
    const file = write('en', [
      { message: 'Hello', translation: '', id: 'greeting' },
      { message: 'Bye', translation: '' },
    ]);

    const output = await plugin.load.handler(file);
    expect(output).toContain('export default');
    const messages = record(output);
    expect(messages.greeting).toBe('Hello');
    // No id and empty translation -> hashed key, source text as value.
    expect(messages[generateHash('Bye', undefined)]).toBe('Bye');
  });

  it('falls back to the source string for keys untranslated in a non-source locale', async () => {
    write('en', [
      { message: 'Hello', id: 'greeting' },
      { message: 'Bye', id: 'farewell' },
    ]);
    const file = write('fr', [{ message: 'Hello', translation: 'Bonjour', id: 'greeting' }]);

    const messages = record(await plugin.load.handler(file));
    expect(messages.greeting).toBe('Bonjour'); // real translation wins
    expect(messages.farewell).toBe('Bye'); // untranslated -> source fallback
  });

  it('resolves an empty non-source locale entirely to source strings', async () => {
    write('en', [{ message: 'Hello', id: 'greeting' }]);
    const file = write('fr', '');

    const messages = record(await plugin.load.handler(file));
    expect(messages.greeting).toBe('Hello');
  });

  it('resolves a configured fallback chain before the source locale', async () => {
    write('en', [
      { message: 'A', id: 'a' },
      { message: 'B', id: 'b' },
      { message: 'C', id: 'c' },
    ]);
    write('en-GB', [
      { message: 'B', translation: 'B-GB', id: 'b' },
      { message: 'C', translation: 'C-GB', id: 'c' },
    ]);
    const file = write('en-NZ', [{ message: 'C', translation: 'C-NZ', id: 'c' }]);

    const messages = record(await plugin.load.handler(file));
    expect(messages.a).toBe('A'); // only in the source
    expect(messages.b).toBe('B-GB'); // from the en-GB fallback
    expect(messages.c).toBe('C-NZ'); // en-NZ wins over en-GB and the source
  });

  it('returns undefined when the id does not match a bucket output', async () => {
    expect(await plugin.load.handler(join(dir, 'other.txt'))).toBeUndefined();
  });
});
