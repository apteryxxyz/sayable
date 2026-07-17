import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeBucket } from '~/__fixtures__/bucket.js';
import Logger from '~/features/logger.js';
import type { Config } from '~/shapes.js';
import { BucketWorker, normalisePathForLogs } from './shared.js';

describe('normalisePathForLogs', () => {
  it('makes a path relative to cwd with forward slashes', () => {
    const abs = join(process.cwd(), 'src', 'deep', 'file.ts');
    expect(normalisePathForLogs(abs)).toBe('src/deep/file.ts');
  });
});

describe('BucketWorker', () => {
  it('stores the config, bucket and logger passed to the constructor', () => {
    const config = { locales: ['en'], buckets: [] } as unknown as Config;
    const bucket = makeBucket();
    const logger = new Logger({ quiet: true });

    class Concrete extends BucketWorker {
      expose() {
        return { config: this.config, bucket: this.bucket, logger: this.logger };
      }
    }

    const worker = new Concrete(config, bucket, logger);
    expect(worker.expose()).toEqual({ config, bucket, logger });
  });
});
