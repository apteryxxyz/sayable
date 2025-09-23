import { Command } from '@buape/carbon';
import type { Sayable } from 'sayable';
import { kSay } from '~/constants.js';
import { combineCommandOptions } from '~/utils/combine-command-options.js';

/**
 * An abstract {@link Command} that supports localisation via {@link Sayable}.
 *
 * `SayableCommand` allows command metadata such as `name`, `description`,
 * and `options` to be generated for multiple locales automatically. Extend
 * this class to define commands that transparently adapt to the active locale.
 *
 * @example
 * ```ts
 * class PingCommand extends SayableCommand {
 *   constructor() {
 *     super((say) => ({
 *       name: say`ping`,
 *       description: say`Ping the bot!`,
 *     }));
 *   }
 *
 *   async run(interaction: CommandInteraction) {
 *     await interaction.reply({
 *       content: interaction.say`Pong!`,
 *     });
 *   }
 * }
 * ```
 */
export abstract class SayableCommand extends Command {
  #makeOptions: (
    say: Sayable,
  ) => Pick<Command, 'name' | 'description' | 'options'>;
  #name: string | undefined;

  /**
   * Create a new localised command.
   *
   * @param make Function that receives a locale-specific {@link Sayable}
   * instance and returns metadata (`name`, `description`, and optional `options`)
   * for that locale.
   */
  constructor(
    makeOptions: (
      say: Sayable,
    ) => Pick<Command, 'name' | 'description' | 'options'>,
  ) {
    super();
    this.#makeOptions = makeOptions;

    Object.defineProperty(this, 'name', {
      ...Object.getOwnPropertyDescriptor(SayableCommand.prototype, 'name'),
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
