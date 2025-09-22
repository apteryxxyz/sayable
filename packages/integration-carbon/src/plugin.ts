import { Plugin } from '@buape/carbon';
import type { Sayable } from 'sayable';
import { kSay } from './constants.js';
import { applyBaseInteractionExtension } from './extensions/base-interaction.js';
import { applyGuildExtension } from './extensions/guild.js';

/**
 * A Carbon plugin that provides a singleton {@link Sayable} instance.
 *
 * `SayablePlugin` registers a {@link Sayable} instance globally and
 * applies interaction and guild-level extensions so that commands and
 * other handlers can access localisation utilities directly.
 *
 * @example
 * ```ts
 * const say = new Sayable({ ... });
 * const client = new Client({ ... }, { ... }, [new SayablePlugin(say)]);
 * ```
 */
export class SayablePlugin extends Plugin {
  id = 'sayable';

  constructor(say: Sayable) {
    super();
    Reflect.set(globalThis, kSay, say);
    applyBaseInteractionExtension();
    applyGuildExtension();
  }
}
