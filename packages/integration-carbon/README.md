# @saykit/carbon

> [Carbon](https://carbon.buape.com) Discord bot integration for [SayKit](https://saykit.js.org).

[![Coverage](https://codecov.io/gh/k0d13/saykit/graph/badge.svg?flag=integration-carbon)](https://codecov.io/gh/k0d13/saykit?flags%5B0%5D=integration-carbon)

Registers a shared catalogue with your Carbon client, helps command and component classes expose translated metadata, and adds locale-aware `interaction.say` and `guild.say` properties.

## Install

```sh
pnpm add @saykit/carbon saykit @buape/carbon
```

## Usage

```ts
import { Client, Command, type CommandInteraction } from '@buape/carbon';
import { SayPlugin } from '@saykit/carbon';
import { catalogue, withSay } from './i18n.js';

class PingCommand extends withSay(Command) {
  constructor() {
    super((say) => ({
      name: say`ping`,
      description: say`Ping the bot!`,
    }));
  }

  async run(interaction: CommandInteraction) {
    await interaction.reply({ content: interaction.say`Pong!` });
  }
}

const client = new Client({/* options */}, { commands: [new PingCommand()] }, [
  new SayPlugin(catalogue),
]);
```

## Documentation

[Carbon integration guide](https://saykit.js.org/integrations/carbon) at [saykit.js.org](https://saykit.js.org).
