import { resolveConfig } from '@saykit/config/features/loader';
import { loadCatalogue } from '../catalogue.js';

/**
 * The slice of webpack's loader context this needs. Typing it here rather than
 * depending on `webpack` keeps the package free of a bundler dependency, and
 * Turbopack implements the same surface for the loaders it runs.
 */
interface LoaderContext {
  resourcePath: string;
  async(): (error: unknown, content?: string) => void;
  addDependency(file: string): void;
}

const config = resolveConfig();

/**
 * Webpack/Turbopack loader that replaces a catalogue file with its assembled
 * record.
 *
 * The catalogue stays a real module, which is the whole point: the importer
 * keeps a dependency edge to it, so editing a catalogue invalidates exactly the
 * modules that read it. Inlining the record into the importer instead leaves the
 * importer's own bytes unchanged, and no bundler can invalidate on that.
 */
export default function saykitLoader(this: LoaderContext, source: string) {
  const callback = this.async();

  loadCatalogue(config, this.resourcePath).then((catalogue) => {
    if (!catalogue) return callback(null, source);

    // Fallback files feed this module, so editing them must invalidate it too.
    for (const file of catalogue.sources) this.addDependency(file);

    callback(null, `export default ${JSON.stringify(catalogue.record)}`);
  }, callback);
}
