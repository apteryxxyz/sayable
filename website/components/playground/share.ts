/**
 * Share state lives in the fragment rather than the query string so the code
 * being experimented with is never sent to the server or logged by it.
 */

export type SharedState = { code: string; version: string };

export function encodeState(state: SharedState) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeState(fragment: string) {
  try {
    const padded = fragment.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;

    if (typeof parsed !== 'object' || parsed === null) return null;
    const { code, version } = parsed as { code?: unknown; version?: unknown };
    if (typeof code !== 'string') return null;

    return { code, version: typeof version === 'string' ? version : undefined };
  } catch {
    return null;
  }
}
