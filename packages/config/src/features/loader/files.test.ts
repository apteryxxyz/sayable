import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { findConfigFile, getConfigFileCandidates } from './files.js';

describe('getConfigFileCandidates', () => {
  it('lists every supported extension for the given name', () => {
    expect(getConfigFileCandidates('saykit')).toEqual([
      'saykit.config.js',
      'saykit.config.cjs',
      'saykit.config.mjs',
      'saykit.config.ts',
      'saykit.config.mts',
      'saykit.config.cts',
    ]);
  });

  it('substitutes a custom module name', () => {
    expect(getConfigFileCandidates('mylib')[0]).toBe('mylib.config.js');
  });
});

describe('findConfigFile', () => {
  const dir = mkdtempSync(join(tmpdir(), 'saykit-files-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('returns the first matching candidate', () => {
    writeFileSync(join(dir, 'saykit.config.ts'), 'export default {}');
    expect(findConfigFile('saykit', dir)).toEqual({ id: join(dir, 'saykit.config.ts') });
  });

  it('returns null when no config file exists', () => {
    expect(findConfigFile('nothing', dir)).toBeNull();
  });
});
