import { Command } from '@commander-js/extra-typings';
import { reconcileLocaleMessages } from '~/features/catalogue/merge.js';
import { readCatalogueMessages, writeCatalogueMessages } from '~/features/catalogue/storage.js';
import { resolveConfig } from '~/features/loader/index.js';
import Logger from '~/features/logger.js';

export default new Command('clean')
  .description('Reconcile non-source locale files against the source locale')
  .option('-v, --verbose', 'enable verbose logging', false)
  .option('-q, --quiet', 'suppress all logging', false)
  .action(async (options) => {
    const config = resolveConfig();
    const logger = new Logger(options);
    logger.header('🧹 Cleaning Locales');

    const [sourceLocale, ...otherLocales] = config.locales;

    for (const bucket of config.buckets) {
      const sourceMessages = await readCatalogueMessages(bucket, sourceLocale);
      logger.info(`Reconciling ${otherLocales.length} locale(s) against ${sourceLocale}`);

      for (const locale of otherLocales) {
        logger.step(`Reconciling ${locale}`);
        const existingMessages = await readCatalogueMessages(bucket, locale);
        const reconciledMessages = reconcileLocaleMessages(existingMessages, sourceMessages);
        await writeCatalogueMessages(bucket, locale, reconciledMessages);
      }
    }

    logger.success('Locales cleaned');
  });
