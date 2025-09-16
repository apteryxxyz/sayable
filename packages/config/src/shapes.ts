import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CompositeMessage } from '@sayable/message-utils';
import { err, ok } from 'neverthrow';
import * as z from 'zod';

type Awaitable<T> = T | PromiseLike<T>;

export const Transformer = z.object({
  transform: z.custom<
    (module: { code: string; id: string }) => Awaitable<string>
  >((val) => typeof val === 'function'),
});

export const Extractor = z.object({
  extract: z.custom<
    (module: { code: string; id: string }) => Awaitable<CompositeMessage[]>
  >((val) => typeof val === 'function'),
});

export const Formatter = z.object({
  extension: z
    .templateLiteral(['.', z.string()])
    .transform((val) => val.slice(1)),
  parse: z.custom<
    (
      content: string,
      context: { locale: string },
    ) => Awaitable<Formatter.Message[]>
  >((val) => typeof val === 'function'),
  stringify: z.custom<
    (
      messages: Formatter.Message[],
      context: { locale: string; previousContent?: string },
    ) => Awaitable<string>
  >((val) => typeof val === 'function'),
});

export namespace Formatter {
  export interface Message {
    message: string;
    translation?: string;
    context?: string;
    comments?: string[];
    references?: `${string}:${number}`[];
  }
}

async function require(id: string) {
  const require = createRequire(join(process.cwd(), 'noop.js'));
  try {
    const url = pathToFileURL(require.resolve(id));
    return ok(await import(url.toString()));
  } catch {
    return err(`Cannot find package '${id}', required by sayable`);
  }
}

export const Catalogue = z.object({
  include: z.string().array(),
  exclude: z.string().array().optional(),
  output: z.templateLiteral([
    z.string(),
    '{locale}',
    z.string(),
    '.{extension}',
  ]),

  extractor: Extractor.optional().transform(async (extractor, context) => {
    if (extractor) return extractor;

    const module = await require('@sayable/plugin');
    if (module.isErr()) {
      context.addIssue(module.error);
      return z.NEVER;
    }
    extractor = module.value.createExtractor();

    const result = Extractor.safeParse(extractor);
    if (result.error) {
      for (const issue of result.error.issues) context.addIssue({ ...issue });
      return z.NEVER;
    }
    return result.data;
  }),

  formatter: Formatter.optional().transform(async (formatter, context) => {
    if (formatter) return formatter;

    const module = await require('@sayable/format-po');
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
    locales: z.string().array().min(1),
    fallbackLocales: z.record(z.string(), z.string().array()).optional(),
    catalogues: z.array(Catalogue),
  })
  .refine(
    (c) => c.sourceLocale === c.locales[0],
    'sourceLocale must be the same as the first locale',
  );
