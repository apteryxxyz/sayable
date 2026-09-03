const PACKAGE = '@saykit/transform-jsx';

/** Versions below this had version numbers out of sync across the workspace. */
const MINIMUM = [0, 5, 0];

export type VersionOption = { value: string; label: string };

/**
 * Fallback so the playground still renders if the registry is unreachable. Not
 * labelled "latest": once a newer release exists, an npm outage would otherwise
 * have this claim to be something it isn't.
 */
const FALLBACK: VersionOption[] = [{ value: '0.5.0', label: '0.5.0 (fallback)' }];

/** Long enough for a slow registry, short enough not to stall a build. */
const REGISTRY_TIMEOUT_MS = 5000;

type Registry = {
  'dist-tags'?: Record<string, string>;
  versions?: Record<string, unknown>;
};

const STABLE = /^(\d+)\.(\d+)\.(\d+)$/;

function parse(version: string) {
  const match = STABLE.exec(version);
  return match ? match.slice(1, 4).map(Number) : null;
}

function compare(a: number[], b: number[]) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/**
 * `0.0.0-beta-20260729113209` is a lot of characters that say very little, and it
 * sets the width of the whole select. The publish date is the part anyone reads.
 */
function betaLabel(version: string) {
  const match = /^\d+\.\d+\.\d+-beta-(\d{4})(\d{2})(\d{2})/.exec(version);
  return match ? `beta (${match[1]}-${match[2]}-${match[3]})` : 'beta';
}

export async function getVersions(): Promise<VersionOption[]> {
  let registry: Registry;

  try {
    const response = await fetch(`https://registry.npmjs.org/${PACKAGE}`, {
      next: { revalidate: 3600 },
      // `fetch` has no deadline of its own, so a stalled registry connection would
      // hold up static generation and every revalidation after it. A timeout
      // rejects into the catch below, which serves FALLBACK
      signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
    });
    if (!response.ok) return FALLBACK;
    registry = (await response.json()) as Registry;
  } catch {
    return FALLBACK;
  }

  const tags = registry['dist-tags'] ?? {};
  const published = new Set(Object.keys(registry.versions ?? {}));

  const stable = [...published]
    .map((version) => ({ version, parsed: parse(version) }))
    .filter((entry) => entry.parsed !== null && compare(entry.parsed, MINIMUM) >= 0)
    .sort((a, b) => compare(b.parsed as number[], a.parsed as number[]))
    .map(({ version }) => ({
      value: version,
      label: version === tags.latest ? `${version} (latest)` : version,
    }));

  // Beta releases are published as `0.0.0-beta-<timestamp>`, which sorts
  // meaninglessly, so surface only the one the beta tag currently points at.
  // A dist-tag is just a pointer: it can name an unpublished version, or one
  // already listed above (`npm dist-tag add pkg@0.5.0 beta`), which would offer a
  // version that fails to load or a duplicate entry with a duplicate React key
  const listed = new Set(stable.map((option) => option.value));
  const beta =
    tags.beta && published.has(tags.beta) && !listed.has(tags.beta)
      ? [{ value: tags.beta, label: betaLabel(tags.beta) }]
      : [];

  const options = [...beta, ...stable];
  return options.length > 0 ? options : FALLBACK;
}
