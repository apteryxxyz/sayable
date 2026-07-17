import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { makeBucket } from '~/__fixtures__/bucket.js';
import { globBucket } from './watch.js';

const root = mkdtempSync(join(tmpdir(), 'saykit-glob-'));
const cwd = process.cwd();

afterAll(() => rmSync(root, { recursive: true, force: true }));
afterEach(() => process.chdir(cwd));

describe('globBucket', () => {
  it('expands include patterns into file paths, honouring exclude', async () => {
    const dir = mkdtempSync(join(root, 'proj-'));
    mkdirSync(join(dir, 'src', 'ignore'), { recursive: true });
    writeFileSync(join(dir, 'src', 'a.ts'), '');
    writeFileSync(join(dir, 'src', 'b.ts'), '');
    writeFileSync(join(dir, 'src', 'ignore', 'c.ts'), '');
    process.chdir(dir);

    const bucket = makeBucket({ include: ['src/**/*.ts'], exclude: ['src/ignore/**'] });
    const paths = await globBucket(bucket);
    const names = paths.map((p) => p.replace(/\\/g, '/').split('/src/')[1]).sort();
    expect(names).toEqual(['a.ts', 'b.ts']);
  });
});
