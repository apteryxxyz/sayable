import { sha256 } from 'js-sha256';

/**
 * Generates a unique hash from any string, can be used as a translation key.
 */
export function generateHash(input: string): string {
  const result = sha256(input);
  const bytes = Uint8Array.from(
    result.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || [],
  );
  return btoa(String.fromCharCode(...bytes)).slice(0, 6);
}
