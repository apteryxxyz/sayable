import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Bucket, Message } from '~/shapes.js';
import { expandBucketOutputIgnoreDirectory, expandBucketOutputPath } from './path.js';

const DECLARATION_CONTENT = `
declare const translations: Record<string, string>;
export default translations;
`.trim();

export async function readCatalogueMessages(
  bucket: Bucket,
  locale: string,
  path = expandBucketOutputPath(bucket, locale),
) {
  const content = await readFile(path, 'utf8').catch(() => '');
  if (!content) return [];
  return bucket.formatter.parse(content);
}

export async function writeCatalogueMessages(
  bucket: Bucket,
  locale: string,
  messages: Message[],
  path = expandBucketOutputPath(bucket, locale),
) {
  const catalogueContent = bucket.formatter.stringify(messages);
  const declarationPath = `${path}.d.ts`;
  const ignoreDirectory = expandBucketOutputIgnoreDirectory(bucket);
  const ignorePath = join(ignoreDirectory, '.gitignore');
  const ignoreContent = `.gitignore\n*.${bucket.formatter.extension.slice(1)}.d.ts`;

  await mkdir(dirname(path), { recursive: true });
  await mkdir(ignoreDirectory, { recursive: true });
  await Promise.all([
    writeFile(path, catalogueContent),
    writeFile(declarationPath, DECLARATION_CONTENT),
    writeFile(ignorePath, ignoreContent),
  ]);
}
