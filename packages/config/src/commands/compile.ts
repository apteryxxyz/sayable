import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative } from 'node:path';
import { Command } from '@commander-js/extra-typings';
import type { output } from 'zod';
import { resolveConfig } from '~/loader/resolve.js';
import Logger, { loggerStorage } from '~/logger.js';
import type { Catalogue, Configuration, Formatter } from '~/shapes.js';
import {
  readMessages,
  resolveOutputFilePath,
  watchDebounce,
} from './extract.js';

export default new Command()
  .name('compile')
  .description('Compile extracted messages into runtime-ready locale files.')
  .option('-v, --verbose', 'enable verbose logging', false)
  .option('-q, --quiet', 'suppress all logging', false)
  .option('-w, --watch', 'watch source files for changes', false)
  .action(async (options) => {
    const config = await resolveConfig();
    const logger = new Logger(options.quiet, options.verbose);
    loggerStorage.enterWith(logger);

    logger.header('📦 Compiling Messages');

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
  const cache = new Map<string, Record<string, string>>();
  const logger = loggerStorage.getStore()!;

  logger.info(`Processing catalogue: ${catalogue.include}`);

  async function writeLocaleMessages(locale: string) {
    const [, messages] = await readMessages(catalogue, locale);
    logger.step(`Loaded ${Object.keys(messages).length} message(s)`);

    const translations = //
      await hydrateMessages(cache, config, catalogue, locale, messages);
    logger.step(`Hydrated for ${Object.keys(translations).length} message(s)`);

    logger.step('Writing runtime file');
    await writeTranslations(catalogue, locale, translations);
  }

  for (const locale of config.locales) {
    logger.step(`Processing ${locale}`);
    await writeLocaleMessages(locale);
  }

  logger.success(`Wrote runtime files for messages`);

  return async () => {
    if (options.watch) {
      logger.info(
        `Watching for changes to ${relative(
          process.cwd(),
          resolveOutputFilePath(catalogue, '{locale}'),
        )}`,
      );

      await Promise.allSettled(
        config.locales.map(async (locale) => {
          const path = resolveOutputFilePath(catalogue, locale);
          for await (const _event of watchDebounce(path))
            await writeLocaleMessages(locale);
        }),
      );
    }
  };
}

async function hydrateMessages(
  cache: Map<string, Record<string, string>>,
  config: output<typeof Configuration>,
  catalogue: output<typeof Catalogue>,
  locale: string,
  messages: Record<string, Formatter.Message>,
) {
  if (cache.has(locale)) return cache.get(locale)!;
  const translations = //
    await applyFallbacks(cache, config, catalogue, locale, messages);
  cache.set(locale, translations);
  return translations;
}

async function applyFallbacks(
  cache: Map<string, Record<string, string>>,
  config: output<typeof Configuration>,
  catalogue: output<typeof Catalogue>,
  locale: string,
  messages: Record<string, Formatter.Message>,
) {
  const fallbacks = [
    ...(config.fallbackLocales?.[locale] ?? []),
    config.sourceLocale,
  ];

  const translations: Record<string, string> = {};
  for (const [id, message] of Object.entries(messages)) {
    if (message.translation) {
      translations[id] = message.translation;
      continue;
    }

    for (const fallback of fallbacks) {
      const fallbackMessages = //
        await hydrateMessages(cache, config, catalogue, fallback, messages);
      if (fallbackMessages[id]) {
        translations[id] = fallbackMessages[id];
        break;
      }
    }
  }

  return translations;
}

async function writeTranslations(
  catalogue: output<typeof Catalogue>,
  locale: string,
  translations: Record<string, string>,
) {
  const outputPath = resolveOutputFilePath(catalogue, locale, 'json');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(translations, null, 2));
}
