import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Command } from '@commander-js/extra-typings';
import { generateHash } from '@sayable/message-utils';
import type { output } from 'zod';
import Logger from '~/logger.js';
import { resolveConfig } from '~/resolve.js';
import type { Catalogue, Configuration, Formatter } from '~/shapes.js';

export default new Command()
  .name('compile')
  .description('Compile extracted messages into runtime-ready locale files.')
  .option('-v, --verbose', 'enable verbose logging', false)
  .option('-q, --quiet', 'suppress all logging', false)
  .action(async (options: { verbose: boolean; quiet: boolean }) => {
    const config = await resolveConfig();
    const logger = new Logger(options.quiet, options.verbose);

    logger.header('📦 Compiling Messages');

    for (const catalogue of config.catalogues) {
      logger.info(`Processing catalogue: ${catalogue.include}`);

      const cache = new Map<string, Record<string, string>>();

      for (const locale of config.locales) {
        logger.step(`Processing ${locale}`);

        const messages = await readMessages(catalogue, locale);
        logger.step(`Loaded ${Object.keys(messages).length} message(s)`);

        const hydratedMessages = //
          await hydrateMessages(cache, config, catalogue, locale, messages);
        logger.step(
          `Hydrated for ${Object.keys(hydratedMessages).length} message(s)`,
        );

        logger.step('Writing runtime file');
        await writeMessagesForLocale(catalogue, locale, hydratedMessages);
      }

      logger.success(`Wrote runtime files for messages`);
    }
  });

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

async function readMessages(
  catalogue: output<typeof Catalogue>,
  locale: string,
) {
  const file = resolveLocaleFile(catalogue, locale);
  const content = await readFile(file, 'utf8');
  return catalogue.formatter.parse(content, { locale });
}

async function hydrateMessages(
  cache: Map<string, Record<string, string>>,
  config: output<typeof Configuration>,
  catalogue: output<typeof Catalogue>,
  locale: string,
  messages: Formatter.Message[],
): Promise<Record<string, string>> {
  if (cache.has(locale)) return cache.get(locale)!;

  const hydratedMessages = await applyFallbacks(
    cache,
    config,
    catalogue,
    locale,
    messages,
  );

  cache.set(locale, hydratedMessages);
  return hydratedMessages;
}

async function applyFallbacks(
  cache: Map<string, Record<string, string>>,
  config: output<typeof Configuration>,
  catalogue: output<typeof Catalogue>,
  locale: string,
  messages: Formatter.Message[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const message of messages) {
    const hash = generateHash(message.message, message.context);

    if (message.translation) {
      result[hash] = message.translation;
      continue;
    }

    const fallbacks = [
      ...(config.fallbackLocales?.[locale] ?? []),
      config.sourceLocale,
    ];

    for (const fallback of fallbacks) {
      const fallbackMessages = //
        await hydrateMessages(cache, config, catalogue, fallback, messages);
      if (fallbackMessages[hash]) {
        result[hash] = fallbackMessages[hash];
        break;
      }
    }
  }

  return result;
}

async function writeMessagesForLocale(
  catalogue: output<typeof Catalogue>,
  locale: string,
  messages: Record<string, string>,
) {
  const outputFile = resolve(
    catalogue.output.replace('{locale}', locale).replace('{extension}', 'json'),
  );
  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(messages, null, 2));
}
