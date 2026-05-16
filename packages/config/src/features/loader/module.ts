import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, parse } from 'node:path';

export type Loader = (path: string) => unknown;

function findCacheDir(fromPath: string) {
  let dir = dirname(fromPath);
  const { root } = parse(dir);
  while (true) {
    const nm = join(dir, 'node_modules');
    if (existsSync(nm)) return join(nm, '.cache', 'saykit', 'config');
    if (dir === root) return join(tmpdir(), 'saykit', 'config');
    dir = dirname(dir);
  }
}

function transpile(path: string, require: NodeRequire) {
  const ts = require('typescript');
  const tsConfigPath = ts.findConfigFile(dirname(path), ts.sys.fileExists);
  const { config: tsConfig, error } = tsConfigPath
    ? ts.readConfigFile(tsConfigPath, ts.sys.readFile)
    : { config: {}, error: null };
  if (error) throw error;

  tsConfig.compilerOptions = {
    ...tsConfig.compilerOptions,
    allowJs: true,
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    target: ts.ScriptTarget.ES2022,
    noEmit: false,
  };

  return ts.transpileModule(readFileSync(path, 'utf8'), tsConfig).outputText as string;
}

function loadWithCache(path: string) {
  const require = createRequire(path);
  const mtimeMs = statSync(path).mtimeMs;
  const hash = createHash('sha1').update(path).digest('hex').slice(0, 16);
  const cacheDir = findCacheDir(path);
  const cachePath = join(cacheDir, `${hash}.${mtimeMs}.cjs`);

  try {
    if (!existsSync(cachePath)) {
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(cachePath, transpile(path, require));

      if (existsSync(cacheDir)) {
        for (const entry of readdirSync(cacheDir)) {
          if (entry.startsWith(`${hash}.`) && entry !== `${hash}.${mtimeMs}.cjs`) {
            try {
              unlinkSync(join(cacheDir, entry));
            } catch {}
          }
        }
      }
    }

    const resolved = require.resolve(cachePath);
    delete require.cache[resolved];
    const module = require(cachePath);
    delete require.cache[resolved];
    return module?.default ?? module;
  } catch (error) {
    throw new Error('Failed to import module', { cause: error });
  }
}

export const js: Loader = (path) => loadWithCache(path);
export const ts: Loader = (path) => loadWithCache(path);

export const configLoaders = Object.freeze({
  '.js': js,
  '.mjs': js,
  '.cjs': js,
  '.ts': ts,
  '.mts': ts,
  '.cts': ts,
});
