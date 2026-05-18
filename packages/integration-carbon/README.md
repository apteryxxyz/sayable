# @saykit/carbon

> [Carbon](https://carbon.buape.com) Discord bot integration for [SayKit](https://saykit.js.org).

Registers a shared `Say` with your Carbon client, helps command and component classes expose translated metadata, and adds locale-aware `interaction.say` and `guild.say` properties.

## Install

```sh
pnpm add @saykit/carbon saykit @buape/carbon
```

## Usage

```ts
import { Client, Command, type CommandInteraction } from '@buape/carbon';
import { SayPlugin, withSay } from '@saykit/carbon';
import say from './i18n.js';

class PingCommand extends withSay(Command) {
  constructor(say: Say) {
    super(say, (say) => ({
      name: say`ping`,
      description: say`Ping the bot!`,
    }));
  }

  async run(interaction: CommandInteraction) {
    await interaction.reply({ content: interaction.say`Pong!` });
  }
}

const client = new Client(
  { /* options */ },
  { commands: [new PingCommand(say)] },
  [new SayPlugin(say)],
);
```

## Documentation

[Carbon integration guide](https://saykit.js.org/integrations/carbon) at [saykit.js.org](https://saykit.js.org).
