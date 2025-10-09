import {
  ApplicationCommandOptionType,
  Button,
  type ButtonInteraction,
  Command,
  type CommandInteraction,
  Row,
} from '@buape/carbon';
import { sayable } from '@sayable/carbon';
import type { Sayable } from 'sayable';

export class RollCommand extends sayable(Command) {
  constructor(say: Sayable) {
    super(say, (say) => ({
      name: say`roll`,
      description: say`Roll the dice!`,
      options: [
        {
          name: say`sides`,
          description: say`The number of sides on the dice.`,
          type: ApplicationCommandOptionType.Integer,
          required: false,
        },
      ],
    }));
  }

  async run(interaction: CommandInteraction) {
    const sides = interaction.options.getInteger('sides') ?? 6;
    const result = Math.floor(Math.random() * sides) + 1;

    await interaction.reply({
      content: interaction.say`The dice rolled ${result}!`,
      components: [new Row([new RollAgainButton(interaction.say, sides)])],
    });
  }
}

export class RollAgainButton extends sayable(Button) {
  customId = 'roll-again';
  constructor(say: Sayable, sides?: number) {
    super({ label: say`Roll Again` });
    if (sides) this.customId = `roll-again:sides=${sides}`;
  }

  override async run(interaction: ButtonInteraction) {
    const { data } = this.customIdParser(interaction.rawData.data.custom_id);
    const sides = Number(data.sides ?? 6);
    const result = Math.floor(Math.random() * sides) + 1;

    await interaction.reply({
      content: interaction.say`The dice rolled ${result}!`,
      components: [new Row([new RollAgainButton(interaction.say, sides)])],
    });
  }
}
