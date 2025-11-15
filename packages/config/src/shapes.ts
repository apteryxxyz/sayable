import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { err, ok } from 'neverthrow';
import * as z from 'zod';

type Awaitable<T> = T | PromiseLike<T>;

export const Formatter = z.object({
  extension: z.templateLiteral(['.', z.string()]).transform((v) => v.slice(1)),
  parse: z.custom<
    (
      content: string,
      context: { locale: string },
    ) => Awaitable<Formatter.Message[]>
  >((v) => typeof v === 'function'),
  stringify: z.custom<
    (
      messages: Formatter.Message[],
      context: { locale: string; previousContent?: string },
    ) => Awaitable<string>
  >((v) => typeof v === 'function'),
});

export namespace Formatter {
  export interface Message {
    message: string;
    translation?: string;
    id: string | undefined;
    context: string | undefined;
    comments: string[];
    references: string[];
  }
}

async function tryImport(id: string) {
  const require = createRequire(join(process.cwd(), 'noop.js'));
  try {
    const url = pathToFileURL(require.resolve(id));
    return ok(await import(url.toString()));
  } catch {
    return err(`Cannot find package '${id}', required by sayable`);
  }
}

export const Bucket = z.object({
  include: z.array(z.string()),
  exclude: z.array(z.string()).optional(),
  output: z.templateLiteral([
    z.string(),
    '{locale}',
    z.string(),
    '.{extension}',
  ]),

  formatter: Formatter.optional().transform(async (formatter, context) => {
    if (formatter) return formatter;

    const module = await tryImport('@sayable/format-po');
    if (module.isErr()) {
      context.addIssue(module.error);
      return z.NEVER;
    }
    formatter = module.value.createFormatter();

    const result = Formatter.safeParse(formatter);
    if (result.error) {
      for (const issue of result.error.issues) context.addIssue({ ...issue });
      return z.NEVER;
    }
    return result.data;
  }),
});

export const Configuration = z
  .object({
    sourceLocale: z.string(),
    locales: z.tuple([z.string()], z.string()),
    fallbackLocales: z.record(z.string(), z.array(z.string())).optional(),
    buckets: z.array(Bucket),
  })
  .refine(
    (c) => c.sourceLocale === c.locales[0],
    'sourceLocale must be the same as the first locale',
  );
