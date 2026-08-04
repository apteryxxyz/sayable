import { resolveConfig } from '@saykit/config/features/loader';
import { loadCatalogue } from '../catalogue.js';

/**
 * The slice of webpack's loader context this needs. Typing it here rather than
 * depending on `webpack` keeps the package free of a bundler dependency, and
 * Turbopack implements the same surface for the loaders it runs.
 */
interface LoaderContext {
  resourcePath: string;
  addDependency(file: string): void;
}

const config = resolveConfig();

/**
 * Replaces a catalogue file with its assembled record.
 *
 * This is a *loader* rather than a plugin because Turbopack runs loaders and
 * not webpack plugins, and it is published only so `withSayKit` can name it in
 * the rules it generates. A plain webpack, Vite or Rollup build should reach for
 * `unplugin-saykit` instead, which does the same job through each bundler's own
 * plugin API.
 *
 * The catalogue stays a real module, which is the whole point: the importer
 * keeps a dependency edge to it, so editing a catalogue invalidates exactly the
 * modules that read it. Inlining the record into the importer instead leaves the
 * importer's own bytes unchanged, and no bundler can invalidate on that.
 */
export default function saykitLoader(this: LoaderContext, source: string) {
  const catalogue = loadCatalogue(config, this.resourcePath);
  if (!catalogue) return source;

  // Fallback files feed this module, so editing them must invalidate it too.
  for (const file of catalogue.sources) this.addDependency(file);

  // Always JavaScript, whatever the catalogue's extension — which is why the
  // generated rules carry `type: 'javascript/auto'` and `as: '*.js'`.
  return `export default ${JSON.stringify(catalogue.record)}`;
}
