import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { types as t, type PluginObj, type PluginAPI, type parse as Parse } from '@babel/core';
import {
  assembleCatalogueRecord,
  resolveCatalogueSources,
} from '@saykit/config/features/catalogue';
import { resolveConfig } from '@saykit/config/features/loader';

declare module '@babel/core' {
  interface PluginAPI {
    addExternalDependency(ref: string): void;
  }
  interface PluginObj {
    parserOverride(code: string, opts: TransformOptions, parse: typeof Parse): ParseResult | null;
  }
}

export default (api: PluginAPI): PluginObj => {
  const config = resolveConfig();

  return {
    name: 'saykit',

    parserOverride(code, opts, parse) {
      const id_ = opts.sourceFileName;
      if (!id_ || id_.includes('node_modules')) return parse(code, opts);

      const id = relative(process.cwd(), id_).replaceAll('\\', '/').split('?')[0]!;
      const bucket = config.buckets.find((b) => b.match(id));
      const transformed = bucket?.transformer.transform(code, id) ?? code;

      return parse(transformed, opts);
    },

    visitor: {
      // TODO: This is fragile, it does not work with dynamic imports, document this
      ImportDeclaration(path, state) {
        const importee = path.node.source.value;
        if (!importee.startsWith('.')) return;
        const importer = state.filename ?? state.file.opts.filename;
        if (!importer) return;
        const id_ = resolve(dirname(importer), importee);

        const id = relative(process.cwd(), id_).replaceAll('\\', '/').split('?')[0]!;
        const bucket = config.buckets.find((b) => b.output.match(id));
        if (!bucket) return;

        const specifier = path.node.specifiers.find((s) => s.type === 'ImportDefaultSpecifier');
        if (!specifier)
          throw path.buildCodeFrameError('SayKit inline imports require a default import');

        // Merge the fallback chain (configured fallbacks + the source locale)
        // so untranslated keys resolve to a fallback string at build time.
        const { sources } = resolveCatalogueSources(config, bucket, id);
        const contents = sources.map((source) => {
          try {
            return readFileSync(source, 'utf8');
          } catch {
            return '';
          }
        });

        for (const source of sources) {
          try {
            api.addExternalDependency(source);
          } catch {}
        }

        const entries = Object.entries(assembleCatalogueRecord(bucket, contents));

        path.replaceWith(
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier(specifier.local.name),
              t.objectExpression(
                entries.map(([key, value]) =>
                  t.objectProperty(t.stringLiteral(key), t.stringLiteral(value)),
                ),
              ),
            ),
          ]),
        );
      },
    },
  };
};
