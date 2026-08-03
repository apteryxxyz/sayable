import { relative } from 'node:path';
import type { PluginObj, parse as Parse } from '@babel/core';
import { resolveConfig } from '@saykit/config/features/loader';

declare module '@babel/core' {
  interface PluginObj {
    parserOverride(code: string, opts: TransformOptions, parse: typeof Parse): ParseResult | null;
  }
}

export default (): PluginObj => {
  const config = resolveConfig();

  return {
    name: 'saykit',

    // The macro rewrite happens in `parserOverride`, before the AST exists, so
    // there is nothing left for a visitor to do. Catalogue imports are handled
    // by the bundler's module pipeline — see `./loader.ts` and
    // `./metro-transformer.ts`.
    visitor: {},

    parserOverride(code, opts, parse) {
      const id_ = opts.sourceFileName;
      if (!id_ || id_.includes('node_modules')) return parse(code, opts);

      const id = relative(process.cwd(), id_).replaceAll('\\', '/').split('?')[0]!;
      const bucket = config.buckets.find((b) => b.match(id));
      const transformed = bucket?.transformer.transform(code, id) ?? code;

      return parse(transformed, opts);
    },
  };
};
