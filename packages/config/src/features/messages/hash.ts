import { createHash } from 'node:crypto';

export function generateHash(input: string, context?: string) {
  return createHash('sha256')
    .update(`${input}\u{001F}${context || ''}`)
    .digest('base64url')
    .slice(0, 6);
}
