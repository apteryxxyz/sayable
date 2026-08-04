import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import type { Bucket, Config } from '@saykit/config';
import {
  assembleCatalogueRecord,
  resolveCatalogueSources,
} from '@saykit/config/features/catalogue';

/** Normalise an absolute path into the form bucket globs are written against. */
const toId = (path: string) => relative(process.cwd(), path).replaceAll('\\', '/').split('?')[0]!;

/**
 * The glob a bucket's catalogues match, e.g. `src/locales/*.po` — the `output`
 * template with its placeholders filled in. Bundlers that select files by glob
 * rather than by predicate need this to target exactly the catalogues, and
 * nothing else sharing their extension.
 */
export const catalogueGlob = (bucket: Bucket) =>
  String(bucket.output)
    .replace('{locale}', '*')
    .replace('{extension}', bucket.formatter.extension.slice(1))
    // Globs are matched against posix-separated paths on every platform.
    .replaceAll('\\', '/')
    .replace(/^\.\//, '');

/** Whether `path` is one of the config's catalogue outputs. */
export const isCatalogue = (config: Config, path: string) =>
  config.buckets.some((bucket) => bucket.output.match(toId(path)));

/**
 * Assemble the catalogue at `path` into a `{ id: string }` record, merging in
 * the fallback chain (configured fallbacks + the source locale) so an
 * untranslated key resolves to a fallback string rather than going missing.
 *
 * Returns `undefined` when the path is not a catalogue, and otherwise reports
 * the files that fed the record alongside it — a bundler that can track them
 * gets invalidation for free when a fallback locale is edited.
 *
 * Reads are synchronous so every caller can share one implementation: Babel's
 * visitor cannot await, and the handful of files in a fallback chain are not
 * worth an async path in a bundler that is blocked on the result anyway.
 */
export function loadCatalogue(config: Config, path: string) {
  const id = toId(path);
  const bucket = config.buckets.find((b) => b.output.match(id));
  if (!bucket) return;

  const { sources } = resolveCatalogueSources(config, bucket, id);
  const contents = sources.map((source) => {
    try {
      return readFileSync(source, 'utf8');
    } catch {
      return '';
    }
  });

  return { record: assembleCatalogueRecord(bucket, contents), sources };
}
