import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeBucket } from '~/__fixtures__/bucket.js';
import { expandBucketOutputPath } from './path.js';

describe('expandBucketOutputPath', () => {
  it('substitutes locale and the formatter extension', () => {
    const bucket = makeBucket({ output: 'locales/{locale}/app.{extension}' });
    expect(expandBucketOutputPath(bucket, 'fr')).toBe(resolve('locales/fr/app.json'));
  });

  it('accepts an explicit extension override', () => {
    const bucket = makeBucket({ output: 'locales/{locale}/app.{extension}' });
    expect(expandBucketOutputPath(bucket, 'de', '.po')).toBe(resolve('locales/de/app.po'));
  });
});
