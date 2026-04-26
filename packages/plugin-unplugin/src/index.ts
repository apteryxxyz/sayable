import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { resolveConfig } from '@saykit/config/features/loader';
import { generateHash } from '@saykit/config/features/messages';
import { createUnplugin } from 'unplugin';

export default createUnplugin((_options?: never) => {
  const config = resolveConfig();

  return {
    name: 'saykit',
    enforce: 'pre',

    transform: {
      filter: { id: { exclude: /node_modules/ } },
      handler: (code, id_) => {
        const id = relative(process.cwd(), id_).replaceAll('\\', '/').split('?')[0]!;
        const bucket = config.buckets.find((b) => b.match(id));
        return bucket?.transformer.transform(code, id) ?? code;
      },
    },

    load: {
      // TODO: Can bucket output be used in this filter?
      filter: { id: { exclude: /node_modules/ } },
      handler: async (id_) => {
        const id = relative(process.cwd(), id_).replaceAll('\\', '/').split('?')[0]!;
        const bucket = config.buckets.find((b) => b.output.match(id));
        if (!bucket) return;

        const content = await readFile(id, 'utf8');
        const messages = bucket.formatter.parse(content);
        const entries = messages.map(
          (m) => [m.id || generateHash(m.message, m.context), m.translation || m.message] as const,
        );

        return `export default ${JSON.stringify(Object.fromEntries(entries))}`;
      },
    },
  };
});
