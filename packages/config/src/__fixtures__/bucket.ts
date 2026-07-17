import { Bucket, type Message } from '~/shapes.js';

/**
 * Build a real (schema-parsed) Bucket backed by trivial in-memory formatter and
 * transformer implementations, for exercising catalogue/loader code paths.
 */
export function makeBucket(
  overrides: {
    include?: string[];
    exclude?: string[];
    output?: `${string}{locale}${string}.{extension}`;
    extract?: (code: string, id: string) => Message[];
  } = {},
) {
  const store: Message[] = [];

  return Bucket.parse({
    include: overrides.include ?? ['src/**/*.ts'],
    exclude: overrides.exclude,
    output: overrides.output ?? 'locales/{locale}/messages.{extension}',
    formatter: {
      extension: '.json',
      parse: (content: string) => (content ? (JSON.parse(content) as Message[]) : []),
      stringify: (messages: Message[]) => JSON.stringify(messages),
    },
    transformer: {
      match: (id: string) => id.endsWith('.ts'),
      extract:
        overrides.extract ??
        ((code: string) => {
          store.length = 0;
          if (code.includes('say')) {
            store.push({
              message: 'Hello',
              translation: undefined,
              id: 'greeting',
              context: undefined,
              comments: [],
              references: ['src/app.ts:1'],
            });
          }
          return store;
        }),
      transform: (code: string) => code,
    },
  });
}
