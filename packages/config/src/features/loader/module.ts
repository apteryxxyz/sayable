import { createRequire } from 'node:module';
import { extname } from 'node:path';

export type Loader = (path: string) => unknown;

/** Requires `path` without leaving it in (or reading it from) the require cache. */
function requireFresh(require: NodeJS.Require, path: string) {
  const resolved = require.resolve(path);
  delete require.cache[resolved];
  const module = require(path);
  delete require.cache[resolved];
  return module?.default ?? module;
}

const TYPESCRIPT = new Set(['.ts', '.mts', '.cts']);

/**
 * Adds what the runtime cannot: why a config it could not read is one it will
 * never read. Everything else is the config's own problem, and its error
 * already describes that better than we could.
 */
function diagnose(error: unknown, path: string) {
  const code = (error as NodeJS.ErrnoException | null)?.code;

  if (code === 'ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX') {
    return 'Enums, namespaces and parameter properties are not erasable, so no runtime will read them.';
  }
  if (code === 'ERR_REQUIRE_ASYNC_MODULE') {
    return 'The config is loaded synchronously, so it cannot use top-level await.';
  }

  // A runtime with no TypeScript support parses the annotations as JavaScript
  // and chokes on the first one, leaving a plain `SyntaxError` to say so. One
  // that does support it reports its own syntax errors with a code, so an
  // uncoded `SyntaxError` here is never the config's fault
  const unreadable =
    code === 'ERR_UNKNOWN_FILE_EXTENSION' || (!code && error instanceof SyntaxError);
  if (unreadable && TYPESCRIPT.has(extname(path).toLowerCase())) {
    return 'Reading this config needs Node 22.18+, or a runtime that loads TypeScript itself (Bun, Deno, tsx).';
  }

  return null;
}

/**
 * Loads a config file as it sits on disk, leaving the runtime to deal with the
 * extension. Nothing is copied or rewritten, so `__dirname`,
 * `import.meta.dirname`, relative specifiers and `require.resolve` all resolve
 * against the config's own directory.
 */
function loadModule(path: string) {
  try {
    return requireFresh(createRequire(path), path);
  } catch (error) {
    const hint = diagnose(error, path);
    throw new Error(hint ? `Failed to import module. ${hint}` : 'Failed to import module', {
      cause: error,
    });
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
