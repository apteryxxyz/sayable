import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateHash } from '@saykit/config/features/messages';
import { afterAll, describe, expect, it, vi } from 'vitest';

const config = {
  buckets: [
    {
      match: (id: string) => id.endsWith('.ts'),
      output: { match: (id: string) => id.endsWith('messages.json') },
      transformer: { transform: (code: string) => code.replace('say', 'SAY') },
      formatter: {
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

const dir = mkdtempSync(join(tmpdir(), 'saykit-unplugin-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('unplugin transform', () => {
  it('transforms code for a matching bucket', () => {
    expect(plugin.transform.handler('say`Hi`', join(process.cwd(), 'src/app.ts'))).toBe('SAY`Hi`');
  });

  it('leaves code untouched when no bucket matches', () => {
    expect(plugin.transform.handler('say`Hi`', join(process.cwd(), 'src/app.css'))).toBe('say`Hi`');
  });
});

describe('unplugin load', () => {
  it('loads a catalogue file into a default-exported record', async () => {
    const file = join(dir, 'messages.json');
    writeFileSync(
      file,
      JSON.stringify([
        { message: 'Hello', translation: 'Bonjour', id: 'greeting' },
        { message: 'Bye', translation: '' },
      ]),
    );

    const output = await plugin.load.handler(file);
    expect(output).toContain('export default');
    const record = JSON.parse(output!.replace('export default ', ''));
    expect(record.greeting).toBe('Bonjour');
    // No id and empty translation -> hashed key, source text as value.
    expect(record[generateHash('Bye', undefined)]).toBe('Bye');
  });

  it('returns undefined when the id does not match a bucket output', async () => {
    expect(await plugin.load.handler(join(dir, 'other.txt'))).toBeUndefined();
  });
});
