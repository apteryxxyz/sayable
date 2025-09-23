import {
  ApplicationCommandOptionType,
  type CommandInteraction,
} from '@buape/carbon';
import { SayableCommand, SayableCommandWithSubcommands } from '@sayable/carbon';

class AddCommand extends SayableCommand {
  constructor() {
    super((say) => ({
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

class SubtractCommand extends SayableCommand {
  constructor() {
    super((say) => ({
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

export default class MathsCommand extends SayableCommandWithSubcommands {
  constructor() {
    super((say) => ({
      name: say`maths`,
      description: say`Maths commands!`,
    }));
  }
  subcommands = [new AddCommand(), new SubtractCommand()];
}
