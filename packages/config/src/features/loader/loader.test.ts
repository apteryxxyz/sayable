import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveConfig } from './resolve.js';

const cwd = process.cwd();
// Inside the repo so the module loader's `createRequire` can resolve
// `typescript` from the root node_modules when transpiling the config.
const dir = mkdtempSync(join(cwd, '.tmp-loader-'));

afterAll(() => rmSync(dir, { recursive: true, force: true }));
beforeEach(() => process.chdir(dir));
afterEach(() => process.chdir(cwd));

describe('resolveConfig', () => {
  it('loads and transpiles a TypeScript config file', () => {
    writeFileSync(
      join(dir, 'saykit.config.ts'),
      `const config: { locales: string[] } = { locales: ['en', 'fr'] };\nexport default config;\n`,
    );
    const config = resolveConfig() as { locales: string[] };
    expect(config.locales).toEqual(['en', 'fr']);
  });

  it('caches the transpiled module across calls', () => {
    writeFileSync(join(dir, 'saykit.config.ts'), `export default { locales: ['de'] };\n`);
    const first = resolveConfig() as { locales: string[] };
    const second = resolveConfig() as { locales: string[] };
    expect(first).toEqual(second);
    expect(second.locales).toEqual(['de']);
  });

  it('throws when no config file is found', () => {
    process.chdir(cwd);
    expect(() => resolveConfig('does-not-exist-xyz')).toThrow('Could not find config file');
  });

  it('throws when the config file default export is not an object', () => {
    writeFileSync(join(dir, 'bad.config.ts'), `export default 42;\n`);
    expect(() => resolveConfig('bad')).toThrow('Invalid config file');
  });

  it('wraps errors thrown while importing the config module', () => {
    writeFileSync(
      join(dir, 'throws.config.ts'),
      `export default (() => { throw new Error('boom'); })();\n`,
    );
    expect(() => resolveConfig('throws')).toThrow('Failed to import module');
  });
});
