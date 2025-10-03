import type { PathLike, WatchOptionsWithStringEncoding } from 'node:fs';
import {
  type FileChangeInfo,
  glob,
  mkdir,
  readFile,
  watch,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { Command } from '@commander-js/extra-typings';
import { generateHash, generateIcuMessageFormat } from '@sayable/tsc-plugin';
import pm from 'picomatch';
import type { output } from 'zod';
import { resolveConfig } from '~/loader/resolve.js';
import Logger, { loggerStorage } from '~/logger.js';
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

  const indexedMessages = new Map<string, Formatter.Message[]>();
  async function processPath(path: string) {
    logger.step(`Processing ${relative(process.cwd(), path)}`);

    const messages = await extractMessages(catalogue, path);
    if (!messages.length) return false;

    indexedMessages.set(path, messages);
    logger.step(
      `Found ${messages.length} message(s) in ${relative(process.cwd(), path)}`,
    );
    return true;
  }

  for (const path of paths) await processPath(path);
  const currentMessages = () => [...indexedMessages.values()].flat();
  logger.info(`Extracted ${currentMessages().length} message(s)`);

  //

  async function writeAllMessages() {
    for (const locale of config.locales) {
      logger.step(`Writing locale file for ${locale}`);
      const messages = mapMessages(...currentMessages());
      await writeMessages(catalogue, locale, config.sourceLocale, messages);
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
  for await (const file of glob(catalogue.include, {
    exclude: catalogue.exclude,
    withFileTypes: true,
  }))
    if (file.isFile()) paths.push(join(file.parentPath, file.name));
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
  const code = await readFile(path, 'utf8').catch(() => '');
  const messages = await catalogue.extractor.extract({ id: path, code });

  return messages.map((message) => {
    const icu = generateIcuMessageFormat(message);
    return {
      message: icu,
      translation: icu,
      context: message.context,
      comments: message.comments ?? [],
      references: message.references ?? [],
    };
  });
}

function mapMessages(...messages: Formatter.Message[]) {
  const mappedMessages = new Map<string, Formatter.Message>();

  for (const message of messages) {
    const hash = generateHash(message.message, message.context);
    const existingMessage = mappedMessages.get(hash);
    if (existingMessage) {
      (existingMessage.comments ??= []).push(...(message.comments ?? []));
      (existingMessage.references ??= []).push(...(message.references ?? []));
    } else {
      mappedMessages.set(hash, message);
    }
  }

  return Object.fromEntries(mappedMessages);
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
  const content = await readFile(path, 'utf8').catch(() => undefined);
  const messages =
    (content && (await catalogue.formatter.parse(content, { locale }))) || [];
  return [content, mapMessages(...messages)] as const;
}

function updateMessages(
  existingMessages: Record<string, Formatter.Message>,
  newMessages: Record<string, Formatter.Message>,
) {
  const mergedMessages = new Map<string, Formatter.Message>();

  for (const [id, newMessage] of Object.entries(newMessages)) {
    const existingMessage = existingMessages[id];

    mergedMessages.set(id, {
      message: newMessage.message,
      translation: undefined,
      ...existingMessage,
      context: newMessage.context,
      comments: newMessage.comments,
      references: newMessage.references,
    });
  }

  return Object.fromEntries(mergedMessages);
}

async function writeMessages(
  catalogue: output<typeof Catalogue>,
  locale: string,
  sourceLocale: string,
  newMessages: Record<string, Formatter.Message>,
) {
  const [existingContent, existingMessages] = //
    await readMessages(catalogue, locale);

  const messages =
    locale !== sourceLocale
      ? updateMessages(existingMessages, newMessages)
      : newMessages;
  const content = await catalogue.formatter.stringify(Object.values(messages), {
    locale,
    previousContent: existingContent,
  });

  const outputPath = resolveOutputFilePath(catalogue, locale);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content);
}
