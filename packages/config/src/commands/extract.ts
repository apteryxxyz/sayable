import { glob, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  type CompositeMessage,
  generateIcuMessageFormat,
} from '@sayable/tsc-plugin';
import { Command } from 'commander';
import type * as z from 'zod';
import { loadConfig } from '~/load.js';
import type { Catalogue, Formatter } from '~/shapes.js';

export default new Command()
  .name('extract')
  .description(
    'extracts messages from source code, formats them for translation, and writes locale-specific translation files',
  )
  .action(async () => {
    const config = await loadConfig();
    if (config.isErr()) return console.error(config.error);

    for (const catalogue of config.value.catalogues) {
      const paths = await globCatalogue(catalogue);
      const sourceMessages = await collectMessages(catalogue, paths) //
        .then((m) => toFormatMessages(m, true));

      for (const locale of config.value.locales) {
        await writeLocaleFile(catalogue, locale, {
          messages: sourceMessages,
          locale: config.value.sourceLocale,
        });
      }
    }
  });

async function globCatalogue(catalogue: z.output<typeof Catalogue>) {
  const paths: string[] = [];
  for await (const path of glob(catalogue.include, {
    exclude: catalogue.exclude,
  }))
    paths.push(path);
  return paths;
}

async function collectMessages(
  catalogue: z.output<typeof Catalogue>,
  paths: string[],
) {
  const messages: Record<string, CompositeMessage> = {};
  for await (const maybeRelativePath of paths) {
    const id = resolve(maybeRelativePath);
    const code = await readFile(id, 'utf8');
    const fileMessages = await catalogue.extractor.extract({ code, id });
    Object.assign(messages, fileMessages);
  }
  return messages;
}

function toFormatMessages(
  messages: Record<string, CompositeMessage>,
  includeTranslation: boolean,
) {
  const result: Record<string, Formatter.Message> = {};
  for (const [id, message] of Object.entries(messages)) {
    const icu = generateIcuMessageFormat(message);
    result[id] = {
      message: icu,
      translation: includeTranslation ? icu : undefined,
      comments: message.comments,
      references: message.references,
    };
  }
  return result;
}

async function writeLocaleFile(
  catalogue: z.output<typeof Catalogue>,
  locale: string,
  source: {
    messages: Record<string, Formatter.Message>;
    locale: string;
  },
) {
  const outputDir = resolve(catalogue.output.replace('{locale}', locale));
  await mkdir(outputDir, { recursive: true });
  const outputFile = resolve(
    outputDir,
    `messages${catalogue.formatter.extension}`,
  );

  if (locale === source.locale) {
    const content = await catalogue.formatter //
      .stringify(source.messages, { locale });
    await writeFile(outputFile, content);
  } else {
    let existingMessages: Record<string, Formatter.Message> = {};

    try {
      const existing = await readFile(outputFile, 'utf8');
      existingMessages = await catalogue.formatter //
        .parse(existing, { locale });
    } catch {}

    const mergedMessages: Record<string, Formatter.Message> = {};
    for (const [id, sourceMessage] of Object.entries(source.messages)) {
      mergedMessages[id] = {
        message: sourceMessage.message,
        ...(existingMessages[id] ?? {}),
        comments: sourceMessage.comments,
        references: sourceMessage.references,
      };
    }

    const content = await catalogue.formatter //
      .stringify(mergedMessages, { locale });
    await writeFile(outputFile, content);
  }
}
