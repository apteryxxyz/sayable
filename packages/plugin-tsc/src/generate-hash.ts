/**
 * KEEP IN SYNC:
 * - `packages/plugin-tsc/src/generate-hash.ts`
 * - `packages/plugin-swc/src/generate_hash.rs`
 */

import { sha256 } from 'js-sha256';

/**
 * Generates a unique repeatable hash from any string, which can be used as a translation key.
 *
 * @param input Input string
 * @param context An optional string to seed the hash with
 * @returns A unique hash
 * @example `generateHash('Hello, world!')` → `3HNlwb`
 */
export function generateHash(input: string, context?: string): string {
  const hasher = sha256.create();
  hasher.update(`${input}\u{001F}${context || ''}`);
  const result = hasher.toString();

  const elements = result.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || [];
  const bytes = Uint8Array.from(elements);
  return btoa(String.fromCharCode(...bytes)).slice(0, 6);
}
