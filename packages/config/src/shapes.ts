import { createFormatter } from '@sayable/format-po';
import { type CompositeMessage, createExtractor } from '@sayable/plugin';
import * as z from 'zod';

type Awaitable<T> = T | Promise<T>;

export const Transformer = z.object({
  transform: z.custom<
    (module: { code: string; id: string }) => Awaitable<string>
  >((val) => typeof val === 'function'),
});

export const Extractor = z.object({
  extract: z.custom<
    (module: {
      code: string;
      id: string;
    }) => Awaitable<Record<string, CompositeMessage>>
  >((val) => typeof val === 'function'),
});

export const Formatter = z.object({
  extension: z.templateLiteral(['.', z.string()]),
  parse: z.custom<
    (
      content: string,
      context: { locale: string },
    ) => Awaitable<Record<string, Formatter.Message>>
  >((val) => typeof val === 'function'),
  stringify: z.custom<
    (
      messages: Record<string, Formatter.Message>,
      context: { locale: string; previousContent?: string },
    ) => Awaitable<string>
  >((val) => typeof val === 'function'),
});

export namespace Formatter {
  export interface Message {
    message: string;
    translation?: string;
    comments?: string[];
    references?: `${string}:${number}:${number}`[];
  }
}

export const Catalogue = z.object({
  include: z.string().array(),
  exclude: z.string().array().optional(),
  extractor: Extractor.default(() => createExtractor()),
  formatter: Formatter.default(() => createFormatter()),
  output: z.templateLiteral([z.string(), '{locale}', z.string(), '/']),
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
