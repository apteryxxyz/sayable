import type { VersionOption } from '@/app/(home)/playground/versions';

/**
 * Every approving review on a pull request publishes the workspace to pkg.pr.new,
 * and esm.sh serves those builds under `/pr/`. So the playground can run a pull
 * request exactly the way it runs a release — the only thing that differs is the
 * URL its runtime is imported from.
 */

/**
 * Prefixed rather than carried as a bare commit, so a single `version` string can
 * name either a release or a preview — the select, the share fragment and the
 * runtime cache all keep working unchanged.
 */
const PREFIX = 'pr-';

/** pkg.pr.new keys its builds on the commit, abbreviated or in full. */
const COMMIT = /^[0-9a-f]{7,40}$/;

/** The version string that selects the pkg.pr.new build of `commit`. */
export function previewVersion(commit: string) {
  return `${PREFIX}${commit}`;
}

/** The commit a preview version names, or `null` if it names a release. */
export function previewCommit(version: string) {
  return version.startsWith(PREFIX) ? version.slice(PREFIX.length) : null;
}

/**
 * Reads the `?preview=<commit>` the pipeline links to from a pull request. The
 * commit is validated rather than trusted: it is interpolated into the URL the
 * playground then imports its runtime from.
 */
export function previewOption(search: string): VersionOption | null {
  const commit = new URLSearchParams(search).get('preview');
  if (!commit || !COMMIT.test(commit)) return null;

  return { value: previewVersion(commit), label: `preview (${commit.slice(0, 7)})` };
}
