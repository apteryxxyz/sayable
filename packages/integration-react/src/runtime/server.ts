import 'server-only';

import { cache } from 'react';
import type { SayKit } from 'saykit';

type SayKitRef = { current: SayKit | null };
const serverContext = cache<() => SayKitRef>(() => ({ current: null }));

/**
 * Set the current {@link SayKit} **server** instance.
 * Must be called before any {@link getSay} calls.
 *
 * @param say The current {@link SayKit} instance
 */
export function setSay(say: SayKit): void {
  const ref = serverContext();
  ref.current = say;
}

/**
 * Get the current {@link SayKit} **server** instance.
 * Must only be called after any {@link setSay} calls.
 *
 * @returns The current {@link SayKit} instance
 */
export function getSay(): SayKit {
  const ref = serverContext();
  if (!ref.current)
    throw new Error(
      'Attempt to access the server-only SayKit instance before initialisation',
      {
        cause: new Error("'getSay' must be called after 'setSay'"),
      },
    );
  return ref.current;
}
