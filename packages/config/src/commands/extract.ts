import { glob, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { generateHash, generateIcuMessageFormat } from '@sayable/message-utils';
import { Command } from 'commander';
import type { output } from 'zod';
import Logger from '~/logger.js';
import { resolveConfig } from '~/resolve.js';
import type { Catalogue, Formatter } from '~/shapes.js';

export default new Command()
  .name('extract')
  .option('-v, --verbose')
  .option('-q, --quiet')
  .action(async (options: { verbose: boolean; quiet: boolean }) => {
    const config = await resolveConfig();
    const logger = new Logger(options.quiet, options.verbose);

    logger.header('🛠 Extracting Messages');

    for (const catalogue of config.catalogues) {
      logger.info(`Processing catalogue: ${catalogue.include}`);

      const paths = await globCatalogue(catalogue);
      logger.step(`Found ${paths.length} file(s)`);

      const messages: Record<string, Formatter.Message> = {};
      for (const path of paths) {
        logger.step(`Processing ${relative(process.cwd(), path)}`);

        const scopedMessages = await extractMessages(catalogue, path);
        logger.step(
          `Found ${Object.keys(scopedMessages).length} message(s) in ${relative(
            process.cwd(),
            path,
          )}`,
        );

        for (const [id, message] of Object.entries(scopedMessages))
          messages[id] = message;
      }

      logger.info(`Extracted ${Object.keys(messages).length} message(s)`);

      for (const locale of config.locales) {
        logger.step(`Writing locale file for ${locale}`);
        await writeMessagesForLocale(catalogue, locale, {
          locale: config.sourceLocale,
          messages: messages,
        });
      }

      logger.success(`Wrote locale files`);
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

async function extractMessages(
  catalogue: output<typeof Catalogue>,
  path: string,
) {
  const result: Record<string, Formatter.Message> = {};
  const code = await readFile(path, 'utf8');
  const messages = await catalogue.extractor.extract({ id: path, code });
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
}
