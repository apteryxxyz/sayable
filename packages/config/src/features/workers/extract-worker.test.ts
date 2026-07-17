import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { makeBucket } from '~/__fixtures__/bucket.js';
import Logger from '~/features/logger.js';
import type { Config } from '~/shapes.js';
import { BucketExtractWorker } from './extract-worker.js';

const root = mkdtempSync(join(tmpdir(), 'saykit-worker-'));
const cwd = process.cwd();
const logger = new Logger({ quiet: true });

function setup(files: Record<string, string>) {
  const dir = mkdtempSync(join(root, 'proj-'));
  mkdirSync(join(dir, 'src'), { recursive: true });
  for (const [name, content] of Object.entries(files))
    writeFileSync(join(dir, 'src', name), content);
  return dir;
}

const bucket = () => makeBucket({ include: ['src/**/*.ts'] });
const config = (): Config => ({ locales: ['en', 'fr'], buckets: [bucket()] });

afterAll(() => rmSync(root, { recursive: true, force: true }));
afterEach(() => process.chdir(cwd));

describe('BucketExtractWorker', () => {
  it('scans source files and writes catalogues for every locale', async () => {
    process.chdir(setup({ 'app.ts': 'const x = say`Hello`;' }));
    const worker = new BucketExtractWorker(config(), bucket(), logger);
    await worker.scan();
    await worker.write();

    const en = JSON.parse(readFileSync(join('locales', 'en', 'messages.json'), 'utf8'));
    const fr = JSON.parse(readFileSync(join('locales', 'fr', 'messages.json'), 'utf8'));
    expect(en[0].id).toBe('greeting');
    expect(fr[0].id).toBe('greeting');
  });

  it('update() re-indexes a file and rewrites when messages change', async () => {
    const dir = setup({ 'app.ts': 'const x = say`Hello`;' });
    process.chdir(dir);
    const worker = new BucketExtractWorker(config(), bucket(), logger);
    await worker.scan();
    await worker.write();

    const changed = await worker.update(join(dir, 'src', 'app.ts'));
    expect(changed).toBe(true);
  });

  it('update() removes stale entries when a file no longer has messages', async () => {
    const dir = setup({ 'app.ts': 'const x = say`Hello`;' });
    process.chdir(dir);
    const worker = new BucketExtractWorker(config(), bucket(), logger);
    await worker.scan();

    // Rewrite the file with no messages, then update.
    writeFileSync(join(dir, 'src', 'app.ts'), 'const x = 1;');
    const removed = await worker.update(join(dir, 'src', 'app.ts'));
    expect(removed).toBe(true);
  });

  it('update() reports no change for a file that never had messages', async () => {
    const dir = setup({ 'plain.ts': 'const x = 1;' });
    process.chdir(dir);
    const worker = new BucketExtractWorker(config(), bucket(), logger);
    await worker.scan();

    const changed = await worker.update(join(dir, 'src', 'plain.ts'));
    expect(changed).toBe(false);
  });
});
