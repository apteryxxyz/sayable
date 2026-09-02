import {
  ApplicationCommandOptionType,
  Command,
  type CommandInteraction,
  CommandWithSubcommands,
} from '@buape/carbon';
import { withSay } from '@saykit/carbon';
import type { Catalogue } from 'saykit';
import { findMember, leaderboard, members } from '../club.js';

/** `/leaderboard books` — who has finished the most this year. */
class BooksCommand extends withSay(Command) {
  constructor(catalogue: Catalogue) {
    super(catalogue, (say) => ({
      name: say`books`,
      description: say`Rank everyone by books finished this year.`,
    }));
  }

  async run(interaction: CommandInteraction) {
    const say = interaction.say;

    const rows = leaderboard().map((member, index) => {
      const place = say.ordinal(index + 1, {
        one: `${index + 1}st`,
        two: `${index + 1}nd`,
        few: `${index + 1}rd`,
        other: `${index + 1}th`,
      });

      const finished = say.plural(member.finished, {
        0: 'nothing yet',
        one: `${member.finished} book`,
        other: `${member.finished} books`,
      });

      return say`${place} — ${member.name}, ${finished}`;
    });

    await interaction.reply({
      content: [say`**Books finished this year**`, ...rows].join('\n'),
    });
  }
}

/** `/leaderboard pages` — a weekly view, with an optional per-member lookup. */
class PagesCommand extends withSay(Command) {
  constructor(catalogue: Catalogue) {
    super(catalogue, (say) => ({
      name: say`pages`,
      description: say`See pages read this week.`,
      options: [
        {
          // Option names and descriptions are localised the same way the
          // command itself is — `properties` runs once per locale.
          name: say`member`,
          description: say`Look up one person instead of everyone.`,
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    }));
  }

  async run(interaction: CommandInteraction) {
    const say = interaction.say;
    const requested = interaction.options.getString('member');

    if (requested) {
      const member = findMember(requested);

      if (!member) {
        await interaction.reply({
          content: say`I do not know anyone called ${requested}.`,
          ephemeral: true,
        });
        return;
      }

      const role = say.select(member.role, {
        host: 'hosts the club',
        member: 'is a regular',
        guest: 'is visiting',
        other: 'is here somehow',
      });

      await interaction.reply({
        content: say`${member.name} ${role} and has read ${say.plural(member.pagesThisWeek, {
          0: 'no pages',
          one: `${member.pagesThisWeek} page`,
          other: `${member.pagesThisWeek} pages`,
        })} this week.`,
      });
      return;
    }

    const total = members.reduce((sum, member) => sum + member.pagesThisWeek, 0);

    await interaction.reply({
      content: say.plural(total, {
        0: 'Nobody has read anything this week. Bold strategy.',
        one: `Between us we have read ${total} page this week.`,
        other: `Between us we have read ${total} pages this week.`,
      }),
    });
  }
}

export class LeaderboardCommand extends withSay(CommandWithSubcommands) {
  constructor(catalogue: Catalogue) {
    super(catalogue, (say) => ({
      name: say`leaderboard`,
      description: say`Reading stats for the club.`,
      subcommands: [new BooksCommand(catalogue), new PagesCommand(catalogue)],
    }));
  }
}
