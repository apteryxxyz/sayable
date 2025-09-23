import type { CommandInteraction } from '@buape/carbon';
import { DiscordSnowflake } from '@sapphire/snowflake';
import { SayableCommand } from '@sayable/carbon';

export default class PingCommand extends SayableCommand {
  constructor() {
    super((say) => ({
      name: say`ping`,
      description: say`Ping the bot!`,
    }));
  }

  async run(interaction: CommandInteraction) {
    const flake = DiscordSnowflake.deconstruct(interaction.rawData.id);
    const latency = Date.now() - Number(flake.timestamp);

    await interaction.reply({
      content: interaction.say`Pong! Latency is ${latency}ms.`,
    });
  }
}
