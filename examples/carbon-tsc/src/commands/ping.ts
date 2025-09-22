import { type CommandInteraction, MessageFlags } from '@buape/carbon';
import { SayableCommand } from '@sayable/carbon';

export default class PingCommand extends SayableCommand {
  constructor() {
    super((say) => ({
      name: say`ping`,
      description: say`Ping the bot!`,
    }));
  }

  async run(interaction: CommandInteraction) {
    await interaction.reply({
      content: interaction.say`Pong! Hello from ${'Carbon'}!`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
