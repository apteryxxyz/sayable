import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import type { Config } from '@saykit/config';
import {
  assembleCatalogueRecord,
  resolveCatalogueSources,
} from '@saykit/config/features/catalogue';

/** Normalise an absolute path into the form bucket globs are written against. */
const toId = (path: string) => relative(process.cwd(), path).replaceAll('\\', '/').split('?')[0]!;

/**
 * Assemble the catalogue at `path` into a `{ id: string }` record, merging the
 * fallback chain (configured fallbacks + the source locale) so an untranslated
 * key resolves to a fallback string.
 *
 * Returns `undefined` when the path is not a catalogue, and otherwise reports
 * the files that fed the record alongside it — a bundler that can track them
 * gets invalidation for free when a fallback locale is edited.
 */
export async function loadCatalogue(config: Config, path: string) {
  const id = toId(path);
  const bucket = config.buckets.find((b) => b.output.match(id));
  if (!bucket) return;

  const { sources } = resolveCatalogueSources(config, bucket, id);
  const contents = await Promise.all(
    sources.map((source) => readFile(source, 'utf8').catch(() => '')),
  );

  return { record: assembleCatalogueRecord(bucket, contents), sources };
}
