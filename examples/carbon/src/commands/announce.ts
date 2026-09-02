import { Command, type CommandInteraction } from '@buape/carbon';
import { withSay } from '@saykit/carbon';
import type { Catalogue } from 'saykit';
import { currentPick, members } from '../club.js';

/**
 * `/announce` — the one place this bot deliberately does **not** use the
 * invoking user's locale.
 *
 * A reply everyone in the channel will read should be in the server's language,
 * not in whatever the person who typed the command happens to use. `guild.say`
 * is the view for the guild's `preferred_locale`, for exactly this case, while
 * `interaction.say` is the view for one user's.
 */
export class AnnounceCommand extends withSay(Command) {
  constructor(catalogue: Catalogue) {
    super(catalogue, (say) => ({
      name: say`announce`,
      description: say`Post the next meeting in the server's language.`,
    }));
  }

  async run(interaction: CommandInteraction) {
    const guild = await interaction.guild?.fetch();

    if (!guild) {
      await interaction.reply({
        // No guild — a DM. Fall back to the user's own locale.
        content: interaction.say`Run this in a server so I know which language to post in.`,
        ephemeral: true,
      });
      return;
    }

    const say = guild.say;

    await interaction.reply({
      content: [
        say`**Book club — next meeting**`,
        say`We are discussing **${currentPick.title}**.`,
        say.plural(currentPick.meetsInDays, {
          0: 'That is today.',
          one: `That is in ${currentPick.meetsInDays} day.`,
          other: `That is in ${currentPick.meetsInDays} days.`,
        }),
        say.plural(members.length, {
          one: `${members.length} person is signed up.`,
          other: `${members.length} people are signed up.`,
        }),
      ].join('\n'),
    });
  }
}
