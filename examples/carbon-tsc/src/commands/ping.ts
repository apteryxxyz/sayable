import type { CommandInteraction } from '@buape/carbon';
import { SayableCommand } from './_base.js';

export default class PingCommand extends SayableCommand {
  constructor() {
    super((say) => ({
      name: say`ping`,
      description: say`Ping the bot!`,
    }));
  }

  async run(interaction: CommandInteraction) {
    await interaction.reply(interaction.say`Pong! Hello from ${'Carbon'}!`);
  }
}
