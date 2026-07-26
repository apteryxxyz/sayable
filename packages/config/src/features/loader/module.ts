import { createRequire } from 'node:module';

export type Loader = (path: string) => unknown;

/** Requires `path` without leaving it in (or reading it from) the require cache. */
function requireFresh(require: NodeJS.Require, path: string) {
  const resolved = require.resolve(path);
  delete require.cache[resolved];
  const module = require(path);
  delete require.cache[resolved];
  return module?.default ?? module;
}

/**
 * Errors that mean the runtime cannot read the file at all, as opposed to the
 * config itself failing. Node has read TypeScript since 22.18; Bun, Deno and
 * hooks like tsx or ts-node always have.
 */
const UNREADABLE = new Set([
  'ERR_UNKNOWN_FILE_EXTENSION',
  'ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX',
  'ERR_INVALID_TYPESCRIPT_SYNTAX',
  'ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING',
]);

/**
 * A `SyntaxError` counts too: a runtime with no TypeScript support parses the
 * annotations as JavaScript and chokes on the first one.
 */
function runtimeCannotRead(error: unknown) {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return (code !== undefined && UNREADABLE.has(code)) || error instanceof SyntaxError;
}

const HINT =
  'Reading this config needs Node 22.18+, or a runtime that loads TypeScript itself (Bun, Deno, tsx).';

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
    const message = runtimeCannotRead(error)
      ? `Failed to import module. ${HINT}`
      : 'Failed to import module';
    throw new Error(message, { cause: error });
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
