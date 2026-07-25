import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import nodeModule from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ts } from './module';

const roots: string[] = [];

function createProject(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'saykit-loader-'));
  roots.push(root);
  for (const [name, content] of Object.entries(files)) {
    const file = join(root, name);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, content);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('ts loader', () => {
  it('loads a config using the TypeScript compiler API', () => {
    // The fixture sits outside the workspace, so point it back at the real compiler.
    const typescript = nodeModule.createRequire(import.meta.url).resolve('typescript');
    const root = createProject({
      'node_modules/typescript/package.json': JSON.stringify({
        name: 'typescript',
        version: '6.0.0',
        main: 'index.js',
      }),
      'node_modules/typescript/index.js': `module.exports = require(${JSON.stringify(typescript)});`,
      'saykit.config.ts': `
        type Config = { locales: string[] };
        const config: Config = { locales: ['en'] };
        export default config;
      `,
    });

    expect(ts(join(root, 'saykit.config.ts'))).toEqual({ locales: ['en'] });
  });

  it('loads a config when typescript exposes no compiler API', () => {
    // typescript@7's root export is essentially version info only.
    const root = createProject({
      'node_modules/typescript/package.json': JSON.stringify({
        name: 'typescript',
        version: '7.0.2',
        main: 'index.js',
      }),
      'node_modules/typescript/index.js': 'module.exports = { version: "7.0.2" };',
      'saykit.config.ts': `
        enum Locale { En = 'en' }
        const config: { locales: string[] } = { locales: [Locale.En] };
        export default config;
      `,
    });

    expect(ts(join(root, 'saykit.config.ts'))).toEqual({ locales: ['en'] });
  });

  it('loads a CommonJS config when typescript exposes no compiler API', () => {
    const root = createProject({
      'node_modules/typescript/package.json': JSON.stringify({
        name: 'typescript',
        version: '7.0.2',
        main: 'index.js',
      }),
      'node_modules/typescript/index.js': 'module.exports = { version: "7.0.2" };',
      'saykit.config.cts': `
        const config: { locales: string[] } = { locales: ['en'] };
        module.exports = config;
      `,
    });

    expect(ts(join(root, 'saykit.config.cts'))).toEqual({ locales: ['en'] });
  });

  it('defers to a registered .ts require hook instead of transpiling', () => {
    const root = createProject({
      'node_modules/.keep': '',
      'saykit.config.ts': `
        const config: { locales: string[] } = { locales: ['en'] };
        module.exports = config;
      `,
    });

    // Stands in for tsx/ts-node, which register a handler for '.ts' the same way.
    const hooks = nodeModule.createRequire(import.meta.url).extensions;
    const previous = hooks['.ts'];
    hooks['.ts'] = (module, filename) => {
      const source = nodeModule.stripTypeScriptTypes(readFileSync(filename, 'utf8'), {
        mode: 'transform',
      });
      (module as unknown as { _compile: (code: string, filename: string) => void })._compile(
        source,
        filename,
      );
    };

    try {
      expect(ts(join(root, 'saykit.config.ts'))).toEqual({ locales: ['en'] });
      expect(existsSync(join(root, 'node_modules', '.cache'))).toBe(false);
    } finally {
      if (previous) hooks['.ts'] = previous;
      else delete hooks['.ts'];
    }
  });
});
