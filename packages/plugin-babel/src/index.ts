import { dirname, relative, resolve } from 'node:path';
import { types as t, type PluginObj, type parse as Parse } from '@babel/core';
import { resolveConfig } from '@saykit/config/features/loader';
import { loadCatalogue } from './catalogue.js';

declare module '@babel/core' {
  interface PluginObj {
    parserOverride(code: string, opts: TransformOptions, parse: typeof Parse): ParseResult | null;
  }
}

export interface Options {
  /**
   * How a catalogue import is resolved.
   *
   * `'inline'` (the default) replaces the import with the assembled record, so
   * the Babel plugin is enough on its own. The cost is that the record lands in
   * the importing module, which a bundler only re-reads when that module's own
   * bytes change — editing a catalogue will not hot-reload.
   *
   * `'module'` leaves the import for a bundler integration to serve —
   * `babel-plugin-saykit/next` or `babel-plugin-saykit/metro`. Set this
   * whenever one of those is wired up, or the import gets inlined before the
   * integration is ever asked for the module.
   */
  catalogues?: 'inline' | 'module';
}

export default (_: unknown, { catalogues = 'inline' }: Options = {}): PluginObj => {
  const config = resolveConfig();

  return {
    name: 'saykit',

    visitor:
      catalogues === 'module'
        ? {}
        : {
            // TODO: This is fragile, it does not work with dynamic imports, document this
            ImportDeclaration(path, state) {
              const importee = path.node.source.value;
              if (!importee.startsWith('.')) return;
              const importer = state.filename ?? state.file.opts.filename;
              if (!importer) return;

              const catalogue = loadCatalogue(config, resolve(dirname(importer), importee));
              if (!catalogue) return;

              const specifier = path.node.specifiers.find(
                (s) => s.type === 'ImportDefaultSpecifier',
              );
              if (!specifier)
                throw path.buildCodeFrameError('SayKit inline imports require a default import');

              path.replaceWith(
                t.variableDeclaration('const', [
                  t.variableDeclarator(
                    t.identifier(specifier.local.name),
                    t.objectExpression(
                      Object.entries(catalogue.record).map(([key, value]) =>
                        t.objectProperty(t.stringLiteral(key), t.stringLiteral(value)),
                      ),
                    ),
                  ),
                ]),
              );
            },
          },

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
