import { createRequire } from 'node:module';
import { isAbsolute, join } from 'node:path';
import { resolveConfig } from '@saykit/config/features/loader';

interface MetroConfig {
  resolver?: { sourceExts?: string[] };
  transformer?: Record<string, unknown>;
  transformerPath?: string;
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
 * to stay a module of its own to be invalidated at all — see
 * `./transformer.ts`.
 */
export function withSayKit<T extends MetroConfig>(metroConfig: T): T {
  const config = resolveConfig();

  // Metro resolves `.json` itself but knows nothing of catalogue formats like
  // `.po`, and a file it cannot resolve is not a module it can invalidate.
  const extensions = config.buckets
    .map((bucket) => bucket.formatter.extension.slice(1))
    .filter((extension) => extension !== 'json');

  const sourceExts = [...(metroConfig.resolver?.sourceExts ?? [])];
  for (const extension of extensions)
    if (!sourceExts.includes(extension)) sourceExts.push(extension);

  // Metro loads a worker standalone, so the wrapped transformer reaches its
  // upstream through the transformer config rather than a closure. Resolve it
  // from the project, since it is the project that depends on Metro.
  const upstream = metroConfig.transformerPath ?? 'metro-transform-worker';

  return {
    ...metroConfig,
    resolver: { ...metroConfig.resolver, sourceExts },
    transformerPath: join(__dirname, 'transformer.cjs'),
    transformer: {
      ...metroConfig.transformer,
      saykitTransformerPath: isAbsolute(upstream)
        ? upstream
        : createRequire(join(process.cwd(), 'metro.config.js')).resolve(upstream),
    },
  };
}
