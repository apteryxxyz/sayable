import { describe, expect, it } from 'vitest';
import { Bucket, type Message, type Transformer } from './shapes.js';
import { defineConfig } from './index.js';

const formatter = {
  extension: '.json' as const,
  parse: () => [],
  stringify: () => '',
};

const message = (m: string): Message => ({
  message: m,
  translation: undefined,
  id: undefined,
  context: undefined,
  comments: [],
  references: [],
});

const transformer = (suffix: string, ext: string): Transformer => ({
  match: (id) => id.endsWith(ext),
  extract: (_code, id) => [message(`from-${suffix}:${id}`)],
  transform: (code) => `${code}/${suffix}`,
});

describe('Bucket schema', () => {
  it('builds an include matcher and an output matcher', () => {
    const bucket = Bucket.parse({
      include: ['src/**/*.ts'],
      output: 'locales/{locale}/messages.{extension}',
      formatter,
      transformer: transformer('a', '.ts'),
    });
    expect(bucket.match('src/app.ts')).toBe(true);
    expect(bucket.match('README.md')).toBe(false);
    expect(bucket.output.match('locales/fr/messages.json')).toBe(true);
    expect(bucket.output.match('locales/fr/other.json')).toBe(false);
  });

  it('honours exclude globs', () => {
    const bucket = Bucket.parse({
      include: ['src/**/*.ts'],
      exclude: ['src/ignore/**'],
      output: 'l/{locale}/m.{extension}',
      formatter,
      transformer: transformer('a', '.ts'),
    });
    expect(bucket.match('src/keep/x.ts')).toBe(true);
    expect(bucket.match('src/ignore/x.ts')).toBe(false);
  });

  it('normalises declared messages into catalogue entries', () => {
    const bucket = Bucket.parse({
      include: ['src/**/*.ts'],
      output: 'l/{locale}/m.{extension}',
      messages: {
        extensionName: 'Reading Time',
        extensionDescription: {
          message: 'Estimate how long a page will take to read.',
          context: 'store',
          comments: ['The one-line store description.'],
        },
      },
      formatter,
      transformer: transformer('a', '.ts'),
    });

    expect(bucket.messages).toEqual([
      {
        id: 'extensionName',
        message: 'Reading Time',
        translation: 'Reading Time',
        context: undefined,
        comments: [],
        references: [],
      },
      {
        id: 'extensionDescription',
        message: 'Estimate how long a page will take to read.',
        translation: 'Estimate how long a page will take to read.',
        context: 'store',
        comments: ['The one-line store description.'],
        references: [],
      },
    ]);
  });

  it('declares no messages when the field is omitted', () => {
    const bucket = Bucket.parse({
      include: ['src/**/*.ts'],
      output: 'l/{locale}/m.{extension}',
      formatter,
      transformer: transformer('a', '.ts'),
    });
    expect(bucket.messages).toEqual([]);
  });

  it('combines an array of transformers, skipping non-matching ones', () => {
    const bucket = Bucket.parse({
      include: ['**/*'],
      output: 'l/{locale}/m.{extension}',
      formatter,
      transformer: [transformer('ts', '.ts'), transformer('js', '.js')],
    });

    // match: true if any transformer matches
    expect(bucket.transformer.match('a.ts')).toBe(true);
    expect(bucket.transformer.match('a.css')).toBe(false);

    // extract: only matching transformers contribute
    expect(bucket.transformer.extract('code', 'a.ts')).toEqual([message('from-ts:a.ts')]);
    expect(bucket.transformer.extract('code', 'a.css')).toEqual([]);

    // transform: applied in sequence, only for matching transformers
    expect(bucket.transformer.transform('code', 'a.ts')).toBe('code/ts');
    expect(bucket.transformer.transform('code', 'a.css')).toBe('code');
  });
});

describe('defineConfig', () => {
  it('parses and returns a validated config', () => {
    const config = defineConfig({
      locales: ['en', 'fr'],
      buckets: [
        {
          include: ['src/**/*.ts'],
          output: 'l/{locale}/m.{extension}',
          formatter,
          transformer: transformer('a', '.ts'),
        },
      ],
    });
    expect(config.locales).toEqual(['en', 'fr']);
    expect(config.buckets).toHaveLength(1);
  });

  it('rejects an invalid config', () => {
    expect(() => defineConfig({ locales: [] as never, buckets: [] })).toThrow();
  });
});
