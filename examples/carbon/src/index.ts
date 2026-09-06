import { Client } from '@buape/carbon';
import { createHandler } from '@buape/carbon/adapters/fetch';
import { CommandDataPlugin } from '@buape/carbon/command-data';
import { SayPlugin } from '@saykit/carbon';
import { AnnounceCommand } from './commands/announce.js';
import { JoinCommand, JoinModal } from './commands/join.js';
import { LeaderboardCommand } from './commands/leaderboard.js';
import { PickCommand, RemindMeButton } from './commands/pick.js';
import { catalogue } from './i18n.js';

const view = catalogue.locale(catalogue.locales[0]);

const client = new Client(
  {
    baseUrl: process.env.BASE_URL,
    deploySecret: process.env.DEPLOY_SECRET,
    clientId: process.env.DISCORD_CLIENT_ID,
    publicKey: process.env.DISCORD_PUBLIC_KEY,
    token: process.env.DISCORD_BOT_TOKEN,
  },
  {
    commands: [
      new PickCommand(),
      new JoinCommand(),
      new LeaderboardCommand(),
      new AnnounceCommand(),
    ],
    components: [new RemindMeButton(view)],
  },
  [new SayPlugin(catalogue), new CommandDataPlugin()],
);

for (const modal of [new JoinModal(view)]) client.modalHandler.registerModal(modal);

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
