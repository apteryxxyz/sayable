import { CommandWithSubcommandGroups } from '@buape/carbon';
import type { Sayable } from 'sayable';
import { kSay } from '~/constants.js';
import { combineCommandOptions } from '~/utils/combine-command-options.js';

/**
 * An abstract {@link CommandWithSubcommandGroups} that supports localisation via {@link Sayable}.
 *
 * `SayableCommandWithSubcommandGroups` allows command metadata such as `name`
 * and `description` to be generated for multiple locales automatically.
 * Extend this class to define commands with subcommand groups that
 * transparently adapt to the active locale.
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
 * class ArithmeticGroup extends SayableCommandWithSubcommands {
 *   // ...
 *   subcommands = [new AddCommand(), new SubtractCommand()];
 * }
 *
 * class MathsCommand extends SayableCommandWithSubcommandGroups {
 *   constructor() {
 *     super((say) => ({
 *       name: say`maths`,
 *       description: say`Maths commands!`,
 *     }));
 *   }
 *   subcommandGroups = [new ArithmeticGroup()];
 * }
 * ```
 */
export abstract class SayableCommandWithSubcommandGroups extends CommandWithSubcommandGroups {
  #makeOptions: (
    say: Sayable,
  ) => Pick<CommandWithSubcommandGroups, 'name' | 'description'>;
  #name: string | undefined;

  constructor(
    makeOptions: (
      say: Sayable,
    ) => Pick<CommandWithSubcommandGroups, 'name' | 'description'>,
  ) {
    super();
    this.#makeOptions = makeOptions;

    Object.defineProperty(this, 'name', {
      ...Object.getOwnPropertyDescriptor(
        SayableCommandWithSubcommandGroups.prototype,
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
