import {
  ApplicationCommandOptionType,
  Command,
  type CommandInteraction,
  CommandWithSubcommands,
} from '@buape/carbon';
import { sayable } from '@sayable/carbon';
import type { Sayable } from 'sayable';

class AddCommand extends sayable(Command) {
  constructor(say: Sayable) {
    super(say, (say) => ({
      name: say`add`,
      description: say`Add two numbers!`,
      options: [
        {
          name: say`a`,
          description: say`The first number.`,
          type: ApplicationCommandOptionType.Number,
          required: true,
        },
        {
          name: say`b`,
          description: say`The second number.`,
          type: ApplicationCommandOptionType.Number,
          required: true,
        },
      ],
    }));
  }

  async run(interaction: CommandInteraction) {
    const a = interaction.options.getNumber('a', true);
    const b = interaction.options.getNumber('b', true);

    await interaction.reply({
      content: interaction.say`The sum is ${a + b}!`,
    });
  }
}

class SubtractCommand extends sayable(Command) {
  constructor(say: Sayable) {
    super(say, (say) => ({
      name: say`subtract`,
      description: say`Subtract two numbers!`,
      options: [
        {
          name: say`a`,
          description: say`The first number.`,
          type: ApplicationCommandOptionType.Number,
          required: true,
        },
        {
          name: say`b`,
          description: say`The second number.`,
          type: ApplicationCommandOptionType.Number,
          required: true,
        },
      ],
    }));
  }

  async run(interaction: CommandInteraction) {
    const a = interaction.options.getNumber('a', true);
    const b = interaction.options.getNumber('b', true);

    await interaction.reply({
      content: interaction.say`The difference is ${a - b}!`,
    });
  }
}

export class MathsCommand extends sayable(CommandWithSubcommands) {
  constructor(say: Sayable) {
    super(say, (say) => ({
      name: say`maths`,
      description: say`Maths commands!`,
      subcommands: [new AddCommand(say), new SubtractCommand(say)],
    }));
  }
}
