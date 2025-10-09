import { Command, type CommandInteraction } from '@buape/carbon';
import { DiscordSnowflake } from '@sapphire/snowflake';
import { sayable } from '@sayable/carbon';
import type { Sayable } from 'sayable';

export class PingCommand extends sayable(Command) {
  constructor(say: Sayable) {
    super(say, (say) => ({
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
