// Builds the body for the single GitHub release that covers a version bump.
//
// Every publishable package shares one version (see the `fixed` group in
// .changeset/config.json), so the release notes are just each package's
// changelog section for that version, concatenated.
//
// Writes RELEASE_NOTES.md and exports `version` to $GITHUB_OUTPUT when running
// in Actions; prints the notes to stdout otherwise.

import { appendFile, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packagesDir = fileURLToPath(new URL('../packages/', import.meta.url));

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const readChangelogSection = async (dir, version) => {
  let changelog;

  try {
    changelog = await readFile(join(dir, 'CHANGELOG.md'), 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return null;
  }

  // Sections are `## <version>` and run until the next `## ` heading.
  const pattern = new RegExp(
    `^## ${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`,
    'm',
  );

  const section = changelog.match(pattern)?.[1]?.trim();

  return section || null;
};

const collect = async () => {
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const packages = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dir = join(packagesDir, entry.name);
    let manifest;

    try {
      manifest = await readJson(join(dir, 'package.json'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      continue;
    }

    if (manifest.private || !manifest.version) continue;

    packages.push({ dir, name: manifest.name, version: manifest.version });
  }

  return packages.sort((a, b) => a.name.localeCompare(b.name));
};

const packages = await collect();

if (packages.length === 0) {
  throw new Error('No publishable packages found under packages/');
}

const versions = [...new Set(packages.map((pkg) => pkg.version))];

// A single tag only makes sense once the whole workspace shares a version.
// Packages predating the merged `fixed` group are still on their old versions
// until the next release bumps everything in lockstep, so emit nothing and let
// the caller skip tagging rather than failing the pipeline.
if (versions.length > 1) {
  process.stderr.write(
    `Skipping release notes: packages are on mixed versions (${versions.join(', ')}).\n`,
  );
  process.exit(0);
}

const [version] = versions;
const sections = [];

for (const pkg of packages) {
  const section = await readChangelogSection(pkg.dir, version);
  if (section) sections.push(`## ${pkg.name}\n\n${section}`);
}

const notes =
  sections.length > 0 ? sections.join('\n\n') : `No changelog entries recorded for ${version}.`;

if (process.env.GITHUB_OUTPUT) {
  await writeFile('RELEASE_NOTES.md', `${notes}\n`);
  await appendFile(process.env.GITHUB_OUTPUT, `version=${version}\n`);
} else {
  process.stdout.write(`${notes}\n`);
}
