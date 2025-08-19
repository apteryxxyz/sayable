import { glob, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { generateHash, generateIcuMessageFormat } from '@sayable/message-utils';
import { Command } from 'commander';
import type { output } from 'zod';
import { resolveConfig } from '~/resolve.js';
import type { Catalogue, Formatter } from '~/shapes.js';

export default new Command()
  .name('extract')
  .description('')
  .action(async () => {
    const config = await resolveConfig();

    for (const catalogue of config.catalogues) {
      const paths = await globCatalogue(catalogue);
      const sourceMessages = await extractCatalogueMessages(catalogue, paths);

      for (const locale of config.locales) {
        await writeMessagesForLocale(catalogue, locale, {
          locale: config.sourceLocale,
          messages: sourceMessages,
        });
      }
    }
  });

async function globCatalogue(catalogue: output<typeof Catalogue>) {
  const paths: string[] = [];
  for await (const path of glob(catalogue.include, {
    exclude: catalogue.exclude,
  }))
    paths.push(resolve(path));
  return paths;
}

async function extractCatalogueMessages(
  catalogue: output<typeof Catalogue>,
  paths: string[],
) {
  const result: Record<string, Formatter.Message> = {};
  for await (const id of paths) {
    const code = await readFile(id, 'utf8');
    const messages = await catalogue.extractor.extract({ id, code });
    for (const message of messages) {
      const icu = generateIcuMessageFormat(message);
      const hash = generateHash(icu, message.context);
      result[hash] = {
        message: icu,
        translation: icu,
        context: message.context,
        comments: message.comments,
        references: message.references,
      };
    }
  }
  return result;
}

function resolveLocaleFile(
  catalogue: output<typeof Catalogue>,
  locale: string,
) {
  return resolve(
    catalogue.output
      .replace('{locale}', locale)
      .replace('{extension}', catalogue.formatter.extension),
  );
}

async function writeMessagesForLocale(
  catalogue: output<typeof Catalogue>,
  locale: string,
  source: {
    locale: string;
    messages: Record<string, Formatter.Message>;
  },
) {
  const outputFile = resolveLocaleFile(catalogue, locale);
  await mkdir(dirname(outputFile), { recursive: true });

  const existingContent = await readFile(outputFile, 'utf8') //
    .catch(() => undefined);
  if (locale !== source.locale) {
    const _existingMessages = existingContent
      ? await catalogue.formatter //
          .parse(existingContent, { locale })
      : [];
    const existingMessages = _existingMessages.reduce<
      Record<string, Formatter.Message>
    >((result, message) => {
      const hash = generateHash(message.message, message.context);
      result[hash] = message;
      return result;
    }, {});

    const mergedMessages: Record<string, Formatter.Message> = {};
    for (const [id, sourceMessage] of Object.entries(source.messages)) {
      const existingMessage = existingMessages[id];
      mergedMessages[id] = {
        message: sourceMessage.message,
        translation: undefined,
        ...existingMessage,
        context: sourceMessage.context,
        comments: sourceMessage.comments,
        references: sourceMessage.references,
      };
    }
    source.messages = mergedMessages;
  }

  const localeContent = await catalogue.formatter.stringify(
    Object.values(source.messages),
    {
      locale,
      previousContent: existingContent,
    },
  );
  await writeFile(outputFile, localeContent);

  /*
  const outputFile = resolveLocaleFile(catalogue, locale);
  await mkdir(dirname(outputFile), { recursive: true });

  const existingContent = await readFile(outputFile, 'utf8') //
    .catch(() => undefined);
  if (locale !== source.locale) {
    const existingMessages = existingContent
      ? await catalogue.formatter //
          .parse(existingContent, { locale })
      : [];

    const mergedMessages: Formatter.Message[] = [];

    // const mergedMessages: Record<string, Formatter.Message> = {};
    // for (const [id, sourceMessage] of Object.entries(source.messages)) {
    //   const existingMessage = existingMessages[id];
    //   mergedMessages[id] = {
    //     message: sourceMessage.message,
    //     translation: undefined,
    //     ...existingMessage,
    //     comments: sourceMessage.comments,
    //     references: sourceMessage.references,
    //   };
    // }
    // source.messages = mergedMessages;
  }

  const localeContent = await catalogue.formatter.stringify(source.messages, {
    locale,
    previousContent: existingContent,
  });
  await writeFile(outputFile, localeContent);
*/
}
