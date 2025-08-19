/**
 * KEEP IN SYNC:
 * - `packages/message-utils/src/generate-hash.ts`
 * - `packages/swc-plugin/src/generate_hash.rs`
 */

import { sha256 } from 'js-sha256';

/**
 * Generates a unique hash from any string, can be used as a translation key.
 */
export function generateHash(input: string, context?: string): string {
  const hasher = sha256.create();
  if (context) {
    hasher.update(`${input}\u{001F}${context}`);
  } else {
    hasher.update(input);
  }

  const result = hasher.toString();
  const elements = result.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || [];
  const bytes = Uint8Array.from(elements);
  return btoa(String.fromCharCode(...bytes)).slice(0, 6);
}
