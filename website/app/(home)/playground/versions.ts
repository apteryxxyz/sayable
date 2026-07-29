const PACKAGE = '@saykit/transform-jsx';

/** Versions below this had version numbers out of sync across the workspace. */
const MINIMUM = [0, 5, 0];

export type VersionOption = { value: string; label: string };

/** Fallback so the playground still renders if the registry is unreachable. */
const FALLBACK: VersionOption[] = [{ value: '0.5.0', label: '0.5.0 (latest)' }];

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

export async function getVersions(): Promise<VersionOption[]> {
  let registry: Registry;

  try {
    const response = await fetch(`https://registry.npmjs.org/${PACKAGE}`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return FALLBACK;
    registry = (await response.json()) as Registry;
  } catch {
    return FALLBACK;
  }

  const tags = registry['dist-tags'] ?? {};

  const stable = Object.keys(registry.versions ?? {})
    .map((version) => ({ version, parsed: parse(version) }))
    .filter((entry) => entry.parsed !== null && compare(entry.parsed, MINIMUM) >= 0)
    .sort((a, b) => compare(b.parsed as number[], a.parsed as number[]))
    .map(({ version }) => ({
      value: version,
      label: version === tags.latest ? `${version} (latest)` : version,
    }));

  // Beta releases are published as `0.0.0-beta-<timestamp>`, which sorts
  // meaninglessly — surface only the one the beta tag currently points at.
  const beta = tags.beta ? [{ value: tags.beta, label: `beta (${tags.beta})` }] : [];

  const options = [...beta, ...stable];
  return options.length > 0 ? options : FALLBACK;
}
