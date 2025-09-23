import { CommandWithSubcommands } from '@buape/carbon';
import type { Sayable } from 'sayable';
import { kSay } from '~/constants.js';
import { combineCommandOptions } from '~/utils/combine-command-options.js';

/**
 * An abstract {@link CommandWithSubcommands} that supports localisation via {@link Sayable}.
 *
 * `SayableCommandWithSubcommands` allows command metadata such as `name` and `description` to be generated for multiple locales automatically. Extend
 * this class to define commands that transparently adapt to the active locale.
 *
 * @example
 * ```ts
 * class AddCommand extends SayableCommand {
 *   // ...
 * }
 *
 * class SubtractCommand extends SayableCommand {
 *   // ...
 * }
 *
 * class MathsCommand extends SayableCommandWithSubcommands {
 *   constructor() {
 *     super((say) => ({
 *       name: say`maths`,
 *       description: say`Maths commands!`,
 *     }));
 *   }
 *   subcommands = [new AddCommand(), new SubtractCommand()];
 * }
 * ```
 */
export abstract class SayableCommandWithSubcommands extends CommandWithSubcommands {
  #makeOptions: (
    say: Sayable,
  ) => Pick<CommandWithSubcommands, 'name' | 'description'>;
  #name: string | undefined;

  constructor(
    makeOptions: (
      say: Sayable,
    ) => Pick<CommandWithSubcommands, 'name' | 'description'>,
  ) {
    super();
    this.#makeOptions = makeOptions;

    Object.defineProperty(this, 'name', {
      ...Object.getOwnPropertyDescriptor(
        SayableCommandWithSubcommands.prototype,
        'name',
      ),
      enumerable: true,
    });
  }

  override get name() {
    if (this.#name) return this.#name;

    const say = Reflect.get(globalThis, kSay) as Sayable;
    if (!say) throw new Error('No `say` instance available');

    const records = {};
    for (const locale of say.locales) {
      const s = say.clone().activate(locale);
      Reflect.set(records, locale, this.#makeOptions(s));
    }

    const options = combineCommandOptions(records, say.locale);
    Object.assign(this, options);

    return this.#name!;
  }

  set name(value: string) {
    this.#name = value;
  }
}
