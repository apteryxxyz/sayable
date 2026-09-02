import { Plugin } from '@buape/carbon';
import type { Catalogue } from 'saykit';
import { kSay } from './constants.js';
import { applyBaseInteractionExtension } from './extensions/base-interaction.js';
import { applyGuildExtension } from './extensions/guild.js';

/**
 * A Carbon plugin that provides a singleton {@link Catalogue}.
 *
 * `SayPlugin` registers a {@link Catalogue} globally and applies interaction and
 * guild-level extensions, so that commands and other handlers can reach a view
 * for their own locale directly.
 *
 * @example
 * ```ts
 * const catalogue = createCatalogue({ ... });
 * const client = new Client({ ... }, { ... }, [new SayPlugin(catalogue)]);
 * ```
 */
export class SayPlugin extends Plugin {
  id = 'saykit';

  constructor(catalogue: Catalogue) {
    super();
    Reflect.set(globalThis, kSay, catalogue);
    applyBaseInteractionExtension();
    applyGuildExtension();
  }
}
