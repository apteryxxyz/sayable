import { Command } from '@commander-js/extra-typings';
import { resolveConfig } from '~/features/loader/index.js';
import Logger from '~/features/logger.js';
import { BucketExtractWorker } from '~/features/workers/extract-worker.js';

export default new Command('extract')
  .description('Extract messages from source files')
  .option('-v, --verbose', 'enable verbose logging', false)
  .option('-q, --quiet', 'suppress all logging', false)
  .option('-w, --watch', 'watch source files for changes', false)
  .action(async (options) => {
    const config = resolveConfig();
    const logger = new Logger(options);
    logger.header('🛠 Extracting Messages');

    const tasks = config.buckets.map(async (b) => {
      const worker = new BucketExtractWorker(config, b, logger);
      await worker.scan();
      await worker.write();
      if (options.watch) await worker.watch();
    });

    const results = await Promise.allSettled(tasks);
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failures.length > 0)
      throw new AggregateError(
        failures.map((f) => f.reason),
        'One or more buckets failed to extract',
      );
  });
