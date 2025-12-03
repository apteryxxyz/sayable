import { Plugin } from '@buape/carbon';
import type { SayKit } from 'saykit';
import { kSay } from './constants.js';
import { applyBaseInteractionExtension } from './extensions/base-interaction.js';
import { applyGuildExtension } from './extensions/guild.js';

/**
 * A Carbon plugin that provides a singleton {@link SayKit} instance.
 *
 * `SayKitPlugin` registers a {@link SayKit} instance globally and
 * applies interaction and guild-level extensions so that commands and
 * other handlers can access localisation utilities directly.
 *
 * @example
 * ```ts
 * const say = new SayKit({ ... });
 * const client = new Client({ ... }, { ... }, [new SayKitPlugin(say)]);
 * ```
 */
export class SayKitPlugin extends Plugin {
  id = 'saykit';

  constructor(say: SayKit) {
    super();
    Reflect.set(globalThis, kSay, say);
    applyBaseInteractionExtension();
    applyGuildExtension();
  }
}
