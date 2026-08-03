import { readFileSync } from 'node:fs';
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
 * Match `path` against the buckets and resolve the fallback chain feeding it
 * (configured fallbacks + the source locale), so an untranslated key resolves
 * to a fallback string rather than going missing.
 */
function resolveCatalogue(config: Config, path: string) {
  const id = toId(path);
  const bucket = config.buckets.find((b) => b.output.match(id));
  if (!bucket) return;

  return { bucket, sources: resolveCatalogueSources(config, bucket, id).sources };
}

/**
 * Assemble the catalogue at `path` into a `{ id: string }` record.
 *
 * Returns `undefined` when the path is not a catalogue, and otherwise reports
 * the files that fed the record alongside it — a bundler that can track them
 * gets invalidation for free when a fallback locale is edited.
 */
export async function loadCatalogue(config: Config, path: string) {
  const found = resolveCatalogue(config, path);
  if (!found) return;

  const contents = await Promise.all(
    found.sources.map((source) => readFile(source, 'utf8').catch(() => '')),
  );

  return { record: assembleCatalogueRecord(found.bucket, contents), sources: found.sources };
}

/** {@link loadCatalogue} for callers that cannot await — Babel visitors. */
export function loadCatalogueSync(config: Config, path: string) {
  const found = resolveCatalogue(config, path);
  if (!found) return;

  const contents = found.sources.map((source) => {
    try {
      return readFileSync(source, 'utf8');
    } catch {
      return '';
    }
  });

  return { record: assembleCatalogueRecord(found.bucket, contents), sources: found.sources };
}
