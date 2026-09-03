import { createRequire } from 'node:module';
import { isAbsolute, join } from 'node:path';
import { resolveConfig } from '@saykit/config/features/loader';

interface MetroConfig {
  projectRoot?: string;
  resolver?: { sourceExts?: string[] };
  transformer?: Record<string, unknown>;
  transformerPath?: string;
}

/**
 * Resolve Metro's own transformer from the project rather than from this
 * package, since it is the project that depends on Metro.
 *
 * The base is the config's `projectRoot`, `process.cwd()` is wrong whenever
 * Metro is started from elsewhere, which in a monorepo is the normal case.
 */
const transformerPath = join(__dirname, 'transformer.cjs');

function resolveUpstream(specifier: string, projectRoot: string) {
  if (isAbsolute(specifier)) return specifier;

  try {
    return createRequire(join(projectRoot, 'metro.config.js')).resolve(specifier);
  } catch {
    // A hoisted install can still satisfy it from here
    return require.resolve(specifier);
  }
}

/**
 * Wrap a Metro config so SayKit catalogues load as real modules.
 *
 * ```js
 * const { withSayKit } = require('babel-plugin-saykit/metro');
 * module.exports = withSayKit(getDefaultConfig(__dirname));
 * ```
 *
 * Metro's transform cache is keyed on each file's own bytes, so a catalogue has
 * to stay a module of its own to be invalidated at all; see
 * `./transformer.ts`.
 *
 * Apply this outermost. Anything wrapped around it that also sets
 * `transformerPath` replaces this one, and catalogues stop being assembled.
 */
export function withSayKit<T extends MetroConfig>(metroConfig: T): T {
  // Wrapping our own transformer would make it its own upstream, and every
  // transform would recurse until the worker died
  if (metroConfig.transformerPath === transformerPath) return metroConfig;

  const config = resolveConfig();

  // Metro resolves `.json` itself but knows nothing of catalogue formats like
  // `.po`, and a file it cannot resolve is not a module it can invalidate
  const extensions = config.buckets
    .map((bucket) => bucket.formatter.extension.slice(1))
    .filter((extension) => extension !== 'json');

  const sourceExts = [...(metroConfig.resolver?.sourceExts ?? [])];
  for (const extension of extensions)
    if (!sourceExts.includes(extension)) sourceExts.push(extension);

  // Metro loads a worker standalone, so the wrapped transformer reaches its
  // upstream through the transformer config rather than a closure
  const upstream = metroConfig.transformerPath ?? 'metro-transform-worker';

  return {
    ...metroConfig,
    resolver: { ...metroConfig.resolver, sourceExts },
    transformerPath,
    transformer: {
      ...metroConfig.transformer,
      saykitTransformerPath: resolveUpstream(upstream, metroConfig.projectRoot ?? process.cwd()),
    },
  };
}
