import { resolveConfig } from '@saykit/config/features/loader';
import { catalogueGlob, isCatalogue } from '../catalogue.js';

/**
 * The slice of Next's config this touches. Typed here rather than imported so
 * the package does not depend on `next`.
 */
interface NextConfig {
  turbopack?: {
    rules?: Record<string, unknown>;
    [key: string]: unknown;
  };
  webpack?: (config: WebpackConfig, context: unknown) => WebpackConfig;
  [key: string]: unknown;
}

interface WebpackConfig {
  module?: { rules?: unknown[] };
  [key: string]: unknown;
}

// Turbopack resolves loaders by module specifier, so this has to be a published
// export even though it is not a supported entry point on its own
const loader = 'babel-plugin-saykit/next/loader';

/**
 * Wrap a Next config so SayKit catalogues load as real modules.
 *
 * ```js
 * import { withSayKit } from 'babel-plugin-saykit/next';
 * export default withSayKit({});
 * ```
 *
 * Pair it with `catalogues: 'module'` on the Babel plugin, which has to
 * leave the import alone for the loader to ever be asked for the module.
 *
 * Rules are derived from the SayKit config, so both bundlers get one per bucket
 * targeting exactly that bucket's `output`, nothing else sharing the extension
 * goes through the loader, which matters most for a `.json` bucket, where the
 * alternative would be routing every JSON import in the app through it.
 */
export function withSayKit<T extends NextConfig>(
  nextConfig: T = {} as T,
): T & Required<Pick<NextConfig, 'turbopack' | 'webpack'>> {
  const config = resolveConfig();

  // Turbopack selects by glob and has no predicate form, so the bucket's output
  // template is filled in and matched wherever it sits under the project root.
  // `as: '*.js'` because the loader emits JavaScript for every extension
  const rules = Object.fromEntries(
    config.buckets.map((bucket) => [
      `**/${catalogueGlob(bucket)}`,
      { loaders: [loader], as: '*.js' },
    ]),
  );

  return {
    ...nextConfig,

    turbopack: {
      ...nextConfig.turbopack,
      rules: { ...nextConfig.turbopack?.rules, ...rules },
    },

    // Turbopack is the default, but `next --webpack` needs the same wiring
    webpack: (webpackConfig: WebpackConfig, context: unknown) => {
      const result = nextConfig.webpack?.(webpackConfig, context) ?? webpackConfig;

      result.module ??= {};
      result.module.rules ??= [];
      result.module.rules.push({
        // A predicate, so the rule covers exactly the catalogues however the
        // buckets are laid out
        test: (path: string) => isCatalogue(config, path),
        use: loader,
        // The loader emits JavaScript, which webpack would not assume for a
        // `.json` catalogue, it would hand the output to its JSON parser
        type: 'javascript/auto',
      });

      return result;
    },
  };
}
