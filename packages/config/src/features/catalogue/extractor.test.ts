import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { makeBucket } from '~/__fixtures__/bucket.js';
import { extractMessagesFromFile } from './extractor.js';

const dir = mkdtempSync(join(tmpdir(), 'saykit-extract-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('extractMessagesFromFile', () => {
  it('extracts messages and rewrites references relative to cwd', async () => {
    const file = join(dir, 'app.ts');
    writeFileSync(file, 'const x = say`Hello`;');
    const messages = await extractMessagesFromFile(file, makeBucket());
    expect(messages).toHaveLength(1);
    expect(messages[0]!.id).toBe('greeting');
    // reference is made relative and forward-slashed
    expect(messages[0]!.references[0]).not.toContain('\\');
  });

  it('defaults a missing translation to the source message', async () => {
    const file = join(dir, 'b.ts');
    writeFileSync(file, 'say`Hello`');
    const [message] = await extractMessagesFromFile(file, makeBucket());
    expect(message!.translation).toBe('Hello');
  });

  it('returns an empty array for a missing file', async () => {
    expect(await extractMessagesFromFile(join(dir, 'nope.ts'), makeBucket())).toEqual([]);
  });

  it('returns an empty array for an empty file', async () => {
    const file = join(dir, 'empty.ts');
    writeFileSync(file, '');
    expect(await extractMessagesFromFile(file, makeBucket())).toEqual([]);
  });
});
