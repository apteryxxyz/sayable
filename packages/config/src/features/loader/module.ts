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
import nodeModule, { createRequire } from 'node:module';
import { tmpdir, userInfo } from 'node:os';
import { dirname, join, parse } from 'node:path';

export type Loader = (path: string) => unknown;

function findUpwards<T>(fromPath: string, visit: (dir: string) => T | null): T | null {
  let dir = dirname(fromPath);
  const { root } = parse(dir);
  while (true) {
    const found = visit(dir);
    if (found !== null) return found;
    if (dir === root) return null;
    dir = dirname(dir);
  }
}

function findNearestTsConfig(fromPath: string) {
  return findUpwards(fromPath, (dir) => {
    const candidate = join(dir, 'tsconfig.json');
    return existsSync(candidate) ? candidate : null;
  });
}

function digest(value: string) {
  return createHash('sha1').update(value).digest('hex').slice(0, 16);
}

/**
 * Builds are executable, so they belong beside the project's dependencies. The
 * fallback lands in a shared temp directory instead, where a fixed path would
 * let any other user on the machine plant code we later require — hence a
 * per-user directory, created private in `compileToCache`.
 */
function findCacheDir(fromPath: string) {
  const nodeModules = findUpwards(fromPath, (dir) => {
    const candidate = join(dir, 'node_modules');
    return existsSync(candidate) ? candidate : null;
  });
  if (nodeModules) return join(nodeModules, '.cache', 'saykit', 'config');

  const { uid, username, homedir } = userInfo();
  return join(tmpdir(), `saykit-config-${digest(`${uid}\0${username}\0${homedir}`)}`);
}

function mtimeOf(path: string | null) {
  return path ? statSync(path).mtimeMs : 0;
}

/** Removes every build of `file` in `dir` except `keep`. */
function pruneCache(dir: string, file: string, keep: string) {
  for (const entry of readdirSync(dir)) {
    if (!entry.startsWith(`${file}.`) || join(dir, entry) === keep) continue;
    try {
      unlinkSync(join(dir, entry));
    } catch {}
  }
}

/**
 * Preferred: the classic TypeScript compiler API, which honours the project's
 * tsconfig and emits CommonJS. TypeScript 7's root export no longer ships it,
 * and the dependency is optional, so this gives up when it isn't there.
 */
function transpileWithCompilerApi(
  source: string,
  tsConfigPath: string | null,
  require: NodeJS.Require,
) {
  let ts;
  try {
    ts = require('typescript');
  } catch {
    return null;
  }
  if (typeof ts?.transpileModule !== 'function' || typeof ts.sys?.readFile !== 'function') {
    return null;
  }

  const { config, error } = tsConfigPath
    ? ts.readConfigFile(tsConfigPath, ts.sys.readFile)
    : { config: {}, error: null };
  if (error) throw error;

  config.compilerOptions = {
    ...config.compilerOptions,
    allowJs: true,
    esModuleInterop: true,
    noEmit: false,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    target: ts.ScriptTarget.ES2022,
  };

  return { code: ts.transpileModule(source, config).outputText as string, extension: 'cjs' };
}

/**
 * Fallback: Node erases the types itself. It ignores tsconfig and leaves the
 * module syntax alone, so the extension has to follow the source.
 */
function transpileWithNode(source: string) {
  if (typeof nodeModule.stripTypeScriptTypes !== 'function') {
    throw new Error(
      'Loading TypeScript config files requires the TypeScript compiler API (typescript <= 6), Node 22.13+, or a runtime that loads TypeScript itself (Bun, Deno, tsx)',
    );
  }

  const code = nodeModule.stripTypeScriptTypes(source, { mode: 'transform' });
  return { code, extension: /^\s*(?:import|export)[\s({]/m.test(code) ? 'mjs' : 'cjs' };
}

/**
 * Writes a plain JavaScript copy of `path` next to the project's dependencies
 * and returns it. Copies are named `<file>.<inputs>.<extension>`, so a build
 * can be reused until its inputs change, and earlier builds of the same file
 * can be pruned once it does.
 */
function compileToCache(path: string, require: NodeJS.Require) {
  const tsConfigPath = findNearestTsConfig(path);
  const dir = findCacheDir(path);
  const file = digest(path);
  const inputs = digest(`${mtimeOf(path)}\0${tsConfigPath}\0${mtimeOf(tsConfigPath)}`);

  const cached = ['cjs', 'mjs']
    .map((ext) => join(dir, `${file}.${inputs}.${ext}`))
    .find(existsSync);
  if (cached) return cached;

  const source = readFileSync(path, 'utf8');
  const { code, extension } =
    transpileWithCompilerApi(source, tsConfigPath, require) ?? transpileWithNode(source);
  const target = join(dir, `${file}.${inputs}.${extension}`);

  mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(target, code, { mode: 0o600 });
  pruneCache(dir, file, target);
  return target;
}

/**
 * Bun, Deno and hooks like tsx or ts-node load TypeScript better than we can,
 * resolving tsconfig `paths` and the project's own module resolution with it.
 */
function runtimeLoadsTypeScript(require: NodeJS.Require) {
  return Boolean(
    process.versions.bun ||
    (globalThis as { Deno?: unknown }).Deno ||
    require.extensions?.['.ts'] ||
    Reflect.get(process, Symbol.for('ts-node.register.instance')),
  );
}

/** Requires `path` without leaving it in (or reading it from) the require cache. */
function requireFresh(require: NodeJS.Require, path: string) {
  const resolved = require.resolve(path);
  delete require.cache[resolved];
  const module = require(path);
  delete require.cache[resolved];
  return module?.default ?? module;
}

/**
 * Loads a config file, compiling it first unless the runtime reads TypeScript
 * on its own.
 */
function loadModule(path: string) {
  const require = createRequire(path);
  try {
    return requireFresh(
      require,
      runtimeLoadsTypeScript(require) ? path : compileToCache(path, require),
    );
  } catch (error) {
    throw new Error('Failed to import module', { cause: error });
  }
}

export const js: Loader = loadModule;
export const ts: Loader = loadModule;

export const configLoaders = Object.freeze({
  '.js': js,
  '.mjs': js,
  '.cjs': js,
  '.ts': ts,
  '.mts': ts,
  '.cts': ts,
});
