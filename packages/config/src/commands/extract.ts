import type { PathLike, WatchOptionsWithStringEncoding } from 'node:fs';
import {
  type FileChangeInfo,
  glob,
  mkdir,
  readFile,
  watch,
  writeFile,
} from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { Command } from '@commander-js/extra-typings';
import { generateHash, generateIcuMessageFormat } from '@sayable/message-utils';
import pm from 'picomatch';
import type { output } from 'zod';
import Logger, { loggerStorage } from '~/logger.js';
import { resolveConfig } from '~/resolve.js';
import type { Catalogue, Configuration, Formatter } from '~/shapes.js';

export default new Command()
  .name('extract')
  .description(
    'Extract messages from source files into translation catalogues.',
  )
  .option('-v, --verbose', 'enable verbose logging', false)
  .option('-q, --quiet', 'suppress all logging', false)
  .option('-w, --watch', 'watch source files for changes', false)
  .action(async (options) => {
    const config = await resolveConfig();
    const logger = new Logger(options.quiet, options.verbose);
    loggerStorage.enterWith(logger);

    logger.header('🛠 Extracting Messages');

    const watchers = [];
    for (const catalogue of config.catalogues)
      watchers.push(await processCatalogue(catalogue, config, options));
    await Promise.allSettled(watchers.map((f) => f()));
  });

async function processCatalogue(
  catalogue: output<typeof Catalogue>,
  config: output<typeof Configuration>,
  options: { watch: boolean },
) {
  const logger = loggerStorage.getStore()!;
  logger.info(`Processing catalogue: ${catalogue.include}`);

  //

  const paths = await globCatalogue(catalogue);
  logger.step(`Found ${paths.length} file(s)`);

  //

  const messagesByFile: Record<string, Record<string, Formatter.Message>> = {};
  async function processPath(path: string) {
    logger.step(`Processing ${relative(process.cwd(), path)}`);

    const messages = await extractMessages(catalogue, path);
    if (!Object.keys(messages).length) return false;

    messagesByFile[path] = messages;
    logger.step(
      `Found ${Object.keys(messages).length} message(s) in ${relative(
        process.cwd(),
        path,
      )}`,
    );
    return true;
  }

  for (const path of paths) await processPath(path);

  const currentMessages = () =>
    Object.assign({}, ...Object.values(messagesByFile));
  logger.info(`Extracted ${Object.keys(currentMessages()).length} message(s)`);

  //

  async function writeAllMessages() {
    for (const locale of config.locales) {
      logger.step(`Writing locale file for ${locale}`);
      await writeMessages(
        catalogue,
        locale,
        config.sourceLocale,
        currentMessages(),
      );
    }
  }

  await writeAllMessages();
  logger.success(`Wrote locale files`);

  return async () => {
    if (options.watch) {
      logger.log(`👀 Watching for changes to ${catalogue.include}`);
      const matcher = pm(catalogue.include, { ignore: catalogue.exclude });

      for await (const event of watchDebounce(process.cwd(), {
        recursive: true,
      })) {
        if (!event.filename || !matcher(event.filename)) continue;

        logger.info(`Detected change in ${event.filename}`);
        const done = await processPath(event.filename);
        if (done) await writeAllMessages();
      }
    }
  };
}

async function globCatalogue(catalogue: output<typeof Catalogue>) {
  const paths: string[] = [];
  for await (const path of glob(catalogue.include, {
    exclude: catalogue.exclude,
  }))
    paths.push(path);
  return paths;
}

export async function* watchDebounce(
  path: PathLike,
  options?: WatchOptionsWithStringEncoding,
) {
  const debounceTimers = new Map<string, NodeJS.Timeout>();
  const pendingEvents = new Map<string, Promise<FileChangeInfo<string>>>();
  const resolvers = new Map<string, (value: FileChangeInfo<string>) => void>();

  (async () => {
    for await (const event of watch(path, options)) {
      const key = event.filename ?? '__unknown__';

      if (debounceTimers.has(key)) clearTimeout(debounceTimers.get(key)!);

      if (!pendingEvents.has(key))
        pendingEvents.set(key, new Promise((r) => resolvers.set(key, r)));

      debounceTimers.set(
        key,
        setTimeout(() => {
          resolvers.get(key)?.(event);
          debounceTimers.delete(key);
          resolvers.delete(key);
        }, 300),
      );
    }
  })();

  while (true) {
    if (pendingEvents.size) {
      const next = await Promise.race(pendingEvents.values());
      pendingEvents.delete(next.filename ?? '__unknown__');
      yield next;
    } else {
      // avoid busy loop, yield control briefly
      await new Promise((r) => setTimeout(r, 10));
    }
  }
}

async function extractMessages(
  catalogue: output<typeof Catalogue>,
  path: string,
) {
  const code = await readFile(path, 'utf8');
  const messages = await catalogue.extractor.extract({ id: path, code });

  const formattedMessages: Record<string, Formatter.Message> = {};
  for (const message of messages) {
    const icu = generateIcuMessageFormat(message);
    const hash = generateHash(icu, message.context);

    formattedMessages[hash] = {
      message: icu,
      translation: icu,
      context: message.context,
      comments: message.comments,
      references: message.references,
    };
  }
  return formattedMessages;
}

export function resolveOutputFilePath(
  catalogue: output<typeof Catalogue>,
  locale: string,
  extension = catalogue.formatter.extension,
) {
  return resolve(
    catalogue.output
      .replaceAll('{locale}', locale)
      .replaceAll('{extension}', extension),
  );
}

export async function readMessages(
  catalogue: output<typeof Catalogue>,
  locale: string,
  path = resolveOutputFilePath(catalogue, locale),
) {
  const content = await readFile(path, 'utf8').catch(() => '');
  const messages = await catalogue.formatter.parse(content, { locale });
  const mapped = messages.reduce(
    (messages, message) => {
      const hash = generateHash(message.message, message.context);
      messages[hash] = message;
      return messages;
    },
    {} as Record<string, Formatter.Message>,
  );

  return Object.assign([content, mapped] as const, mapped);
}

function updateMessages(
  existingMessages: Record<string, Formatter.Message>,
  newMessages: Record<string, Formatter.Message>,
) {
  const mergedMessages: Record<string, Formatter.Message> = {};
  for (const [id, newMessage] of Object.entries(newMessages)) {
    const existingMessage = existingMessages[id];

    mergedMessages[id] = {
      message: newMessage.message,
      translation: undefined,
      ...existingMessage,
      context: newMessage.context,
      comments: newMessage.comments,
      references: newMessage.references,
    };
  }
  return mergedMessages;
}

async function writeMessages(
  catalogue: output<typeof Catalogue>,
  locale: string,
  sourceLocale: string,
  newMessages: Record<string, Formatter.Message>,
) {
  const [existingContent, existingMessages] = //
    await readMessages(catalogue, locale);

  const localeMessages =
    locale !== sourceLocale
      ? updateMessages(existingMessages, newMessages)
      : newMessages;

  const localeContent = await catalogue.formatter.stringify(
    Object.values(localeMessages),
    { locale, previousContent: existingContent },
  );

  const outputPath = resolveOutputFilePath(catalogue, locale);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, localeContent);
}
