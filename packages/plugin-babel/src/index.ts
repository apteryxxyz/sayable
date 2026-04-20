import { relative } from 'node:path';
import { type PluginObj, type parse as Parse } from '@babel/core';
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
