import { join } from 'node:path';
import type { Message } from '~/shapes';
import { extractMessagesFromFile } from '../catalogue/extractor';
import { mergeExtractedMessages, reconcileLocaleMessages } from '../catalogue/merge';
import { readCatalogueMessages, writeCatalogueMessages } from '../catalogue/storage';
import { globBucket, watchDebounced } from '../watch';
import { BucketWorker, normalisePathForLogs } from './shared';

export class BucketExtractWorker extends BucketWorker {
  #indexedMessagesByPath = new Map<string, Message[]>();
  get #indexedMessages() {
    return Array.from(this.#indexedMessagesByPath.values()).flat();
  }

  async #indexPath(path: string) {
    const relativePath = normalisePathForLogs(path);
    this.logger.step(`Processing ${relativePath}`);

    const messages = await extractMessagesFromFile(path, this.bucket);
    if (!messages.length) {
      if (this.#indexedMessagesByPath.has(path)) {
        this.#indexedMessagesByPath.delete(path);
        this.logger.step(`Removed stale entries for ${relativePath}`);
        return true;
      }
      return false;
    }

    this.#indexedMessagesByPath.set(path, messages);
    this.logger.step(`Found ${messages.length} message(s) in ${relativePath}`);
    return true;
  }

  async scan() {
    this.logger.info(`Scanning bucket: ${this.bucket.include}`);

    const paths = await globBucket(this.bucket);
    this.logger.step(`Found ${paths.length} file(s)`);
    await Promise.all(paths.map((p) => this.#indexPath(p)));

    this.logger.info(`Total extracted messages: ${this.#indexedMessages.length}`);
  }

  async write() {
    const mergedMessages = mergeExtractedMessages(this.#indexedMessages);
    this.logger.info(`Writing ${mergedMessages.length} messages to locales`);

    for (const locale of this.config.locales) {
      this.logger.step(`Writing locale file for ${locale} to disk`);

      const existingMessages = await readCatalogueMessages(this.bucket, locale);
      const nextMessages =
        locale === this.config.locales[0]
          ? mergedMessages
          : reconcileLocaleMessages(existingMessages, mergedMessages);

      await writeCatalogueMessages(this.bucket, locale, nextMessages);
    }

    this.logger.success(`Extraction complete for bucket: ${this.bucket.include}`);
  }

  async update(path: string) {
    const changed = await this.#indexPath(path);
    if (changed) await this.write();
    return changed;
  }

  async watch() {
    this.logger.header(`👀 Watching bucket for changes: ${this.bucket.include}`);

    for await (const event of watchDebounced('.', { recursive: true })) {
      if (!event.filename || !this.bucket.match(event.filename)) continue;
      const path = join(process.cwd(), event.filename);
      await this.update(path);
    }
  }
}
