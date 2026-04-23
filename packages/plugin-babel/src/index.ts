import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { types as t, type PluginObj, type parse as Parse } from '@babel/core';
import { resolveConfig } from '@saykit/config/features/loader';
import { generateHash } from '@saykit/config/features/messages';

declare module '@babel/core' {
  interface PluginObj {
    parserOverride(code: string, opts: TransformOptions, parse: typeof Parse): ParseResult | null;
  }
}

export default (): PluginObj => {
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
        const importer = state.filename ?? state.file.opts.filename;
        if (!importer) return;
        const id_ = resolve(dirname(importer), path.node.source.value);

        const id = relative(process.cwd(), id_).replaceAll('\\', '/').split('?')[0]!;
        const bucket = config.buckets.find((b) => b.output.match(id));
        if (!bucket) return;

        const specifier = path.node.specifiers.find((s) => s.type === 'ImportDefaultSpecifier');
        if (!specifier)
          throw path.buildCodeFrameError('SayKit inline imports require a default import');

        const content = readFileSync(id, 'utf8');
        const messages = bucket.formatter.parse(content);
        const entries = messages.map(
          (m) => [m.id || generateHash(m.message, m.context), m.translation || m.message] as const,
        );

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
