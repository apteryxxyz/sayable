import { Client } from '@buape/carbon';
import { createHandler } from '@buape/carbon/adapters/fetch';
import { SayablePlugin } from '@sayable/carbon';
import PingCommand from './commands/ping.js';
import say from './i18n.js';

// Command constructors rely on the global `say` instance that the plugin defines
// Need to construct the plugin before the commands are constructed
const sayable = new SayablePlugin(say);

const client = new Client(
  {
    baseUrl: process.env.BASE_URL,
    deploySecret: process.env.DEPLOY_SECRET,
    clientId: process.env.DISCORD_CLIENT_ID,
    publicKey: process.env.DISCORD_PUBLIC_KEY,
    token: process.env.DISCORD_BOT_TOKEN,
  },
  {
    commands: [new PingCommand()],
  },
  [sayable],
);

const handler = createHandler(client);
export default { fetch: handler };

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BASE_URL: string;
      DEPLOY_SECRET: string;
      DISCORD_CLIENT_ID: string;
      DISCORD_PUBLIC_KEY: string;
      DISCORD_BOT_TOKEN: string;
    }
  }
}
