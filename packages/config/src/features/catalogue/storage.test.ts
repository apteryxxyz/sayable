import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { makeBucket } from '~/__fixtures__/bucket.js';
import { readCatalogueMessages, writeCatalogueMessages } from './storage.js';

const dir = mkdtempSync(join(tmpdir(), 'saykit-storage-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const message = {
  message: 'Hello',
  translation: 'Bonjour',
  id: 'greeting',
  context: undefined,
  comments: [],
  references: [],
};

describe('writeCatalogueMessages / readCatalogueMessages', () => {
  it('writes the catalogue and its .d.ts declaration', async () => {
    const path = join(dir, 'fr.json');
    await writeCatalogueMessages(makeBucket(), 'fr', [message], path);
    expect(existsSync(path)).toBe(true);
    expect(existsSync(`${path}.d.ts`)).toBe(true);
    expect(readFileSync(`${path}.d.ts`, 'utf8')).toContain('export default messages');
  });

  it('round-trips through read', async () => {
    const path = join(dir, 'de.json');
    await writeCatalogueMessages(makeBucket(), 'de', [message], path);
    const read = await readCatalogueMessages(makeBucket(), 'de', path);
    expect(read).toContainEqual(expect.objectContaining({ id: 'greeting' }));
  });

  it('passes existing content to the formatter when the file already exists', async () => {
    const path = join(dir, 'existing.json');
    await writeCatalogueMessages(makeBucket(), 'en', [message], path);
    // Second write should read the existing file first (no throw).
    await expect(
      writeCatalogueMessages(makeBucket(), 'en', [message], path),
    ).resolves.toBeUndefined();
  });

  it('returns an empty array when the catalogue file is missing', async () => {
    expect(await readCatalogueMessages(makeBucket(), 'zz', join(dir, 'missing.json'))).toEqual([]);
  });
});
