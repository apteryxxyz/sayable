import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Command } from 'commander';
import type * as z from 'zod';
import { loadConfig } from '~/load.js';
import type { Catalogue, Configuration } from '~/shapes.js';

export default new Command()
  .name('compile')
  .description(
    'compiles and writes translated message files for each locale, applying fallbacks where necessary and ensuring proper formatting',
  )
  .action(async () => {
    const config = await loadConfig();
    if (config.isErr()) return console.error(config.error);

    for (const catalogue of config.value.catalogues) {
      const cache = new Map<string, Record<string, string>>();
      for (const locale of config.value.locales) {
        const messages = //
          await readAndAssertMessages(cache, config.value, catalogue, locale);
        await writeLocaleFile(catalogue, locale, messages);
      }
    }
  });

async function readAndAssertMessages(
  cache: Map<string, Record<string, string>>,
  config: z.output<typeof Configuration>,
  catalogue: z.output<typeof Catalogue>,
  locale: string,
) {
  if (cache.has(locale)) return cache.get(locale)!;

  const outDir = resolve(catalogue.output.replace('{locale}', locale));
  const outFile = resolve(outDir, `messages${catalogue.formatter.extension}`);
  const content = await readFile(outFile, 'utf8');

  const result = await catalogue.formatter.parse(content, { locale });
  const messages: Record<string, string> = {};
  for (const [id, message] of Object.entries(result)) {
    if (message.translation) {
      messages[id] = message.translation;
    } else {
      const fallbacks = [
        ...(config.fallbackLocales?.[locale] ?? []),
        config.sourceLocale,
      ];
      for (const fallback of fallbacks) {
        const fallbackMessages = //
          await readAndAssertMessages(cache, config, catalogue, fallback);
        if (fallbackMessages[id]) {
          messages[id] = fallbackMessages[id];
          break;
        }
      }
    }
  }
  return messages;
}

async function writeLocaleFile(
  catalogue: z.output<typeof Catalogue>,
  locale: string,
  messages: Record<string, string>,
) {
  const outDir = resolve(catalogue.output.replace('{locale}', locale));
  await mkdir(outDir, { recursive: true });

  const outFile = resolve(outDir, 'messages.json');
  await writeFile(outFile, JSON.stringify(messages, null, 2));
}
