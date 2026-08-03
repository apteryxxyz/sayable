import { resolveConfig } from '@saykit/config/features/loader';
import { loadCatalogue } from '../catalogue.js';

/**
 * The transformer config Metro hands each worker call. `saykitTransformerPath`
 * is the upstream worker this one wraps, stashed here by {@link withSayKit}
 * because a worker is loaded standalone and has no other way to reach it.
 */
interface TransformerConfig {
  saykitTransformerPath: string;
}

interface Worker {
  transform(
    config: TransformerConfig,
    projectRoot: string,
    filename: string,
    data: Buffer,
    options: unknown,
  ): Promise<unknown>;
  getCacheKey(config: TransformerConfig, options?: unknown): string;
}

const config = resolveConfig();

const upstream = (transformerConfig: TransformerConfig): Worker =>
  require(transformerConfig.saykitTransformerPath) as Worker;

/**
 * Metro reads `.json` straight through `transformJSON` and never runs Babel over
 * it, so a Babel plugin cannot reach a catalogue at all. Wrapping the transform
 * worker is the one place that can: it substitutes the assembled record for the
 * catalogue's own source, leaving the file a real module whose sha1 — and
 * therefore Metro's transform cache entry — moves whenever it is edited.
 */
export async function transform(
  transformerConfig: TransformerConfig,
  projectRoot: string,
  filename: string,
  data: Buffer,
  options: unknown,
) {
  const worker = upstream(transformerConfig);
  const catalogue = await loadCatalogue(config, filename);
  if (!catalogue) return worker.transform(transformerConfig, projectRoot, filename, data, options);

  // Metro reads a `.json` module as its body verbatim and everything else as
  // JavaScript, so each needs the record in the shape it expects.
  const record = JSON.stringify(catalogue.record);
  const code = filename.endsWith('.json') ? record : `module.exports = ${record};`;

  return worker.transform(transformerConfig, projectRoot, filename, Buffer.from(code), options);
}

export function getCacheKey(transformerConfig: TransformerConfig, options?: unknown) {
  return upstream(transformerConfig).getCacheKey(transformerConfig, options);
}
