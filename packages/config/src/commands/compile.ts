import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { generateHash } from '@sayable/message-utils';
import { Command } from 'commander';
import type { output } from 'zod';
import { resolveConfig } from '~/resolve.js';
import type { Catalogue, Configuration, Formatter } from '~/shapes.js';

export default new Command()
  .name('compile')
  .description('')
  .action(async () => {
    const config = await resolveConfig();

    for (const catalogue of config.catalogues) {
      const cache = new Map<string, Record<string, string>>();
      for (const locale of config.locales) {
        const messages = //
          await hydrateLocaleMessages(cache, config, catalogue, locale);
        await writeMessagesForLocale(catalogue, locale, messages);
      }
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

async function readLocaleFile(
  catalogue: output<typeof Catalogue>,
  locale: string,
) {
  const file = resolveLocaleFile(catalogue, locale);
  const content = await readFile(file, 'utf8');
  return catalogue.formatter.parse(content, { locale });
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
        await hydrateLocaleMessages(cache, config, catalogue, fallback);
      if (fallbackMessages[hash]) {
        result[hash] = fallbackMessages[hash];
        break;
      }
    }
  }

  return result;
}

async function hydrateLocaleMessages(
  cache: Map<string, Record<string, string>>,
  config: output<typeof Configuration>,
  catalogue: output<typeof Catalogue>,
  locale: string,
): Promise<Record<string, string>> {
  if (cache.has(locale)) return cache.get(locale)!;

  const rawMessages = await readLocaleFile(catalogue, locale);
  const messages = await applyFallbacks(
    cache,
    config,
    catalogue,
    locale,
    rawMessages,
  );

  cache.set(locale, messages);
  return messages;
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
