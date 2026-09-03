import {
  Button,
  type ButtonInteraction,
  Command,
  type CommandInteraction,
  Row,
} from '@buape/carbon';
import { withSay } from '@saykit/carbon';
import type { Catalogue, View } from 'saykit';
import { currentPick } from '../club.js';

export class PickCommand extends withSay(Command) {
  constructor(catalogue: Catalogue) {
    super(catalogue, (say) => ({
      name: say`pick`,
      description: say`See what the club is reading right now.`,
    }));
  }

  async run(interaction: CommandInteraction) {
    const say = interaction.say;

    const meeting =
      currentPick.meetsInDays === 0
        ? say`We meet today.`
        : say.plural(currentPick.meetsInDays, {
            one: `We meet in ${currentPick.meetsInDays} day.`,
            other: `We meet in ${currentPick.meetsInDays} days.`,
          });

    await interaction.reply({
      content: [
        say`We are reading **${currentPick.title}** by ${currentPick.author}.`,
        say.plural(currentPick.pages, {
          one: `${currentPick.pages} page.`,
          other: `${currentPick.pages} pages.`,
        }),
        meeting,
      ].join(' '),
      components: [new Row([new RemindMeButton(say)])],
    });
  }
}

export class RemindMeButton extends withSay(Button) {
  customId = 'remind-me';

  constructor(say: View) {
    super({ label: say`Remind me the day before` });
  }

  override async run(interaction: ButtonInteraction) {
    await interaction.reply({
      content: interaction.say`Noted — I will nudge you the day before we meet.`,
      ephemeral: true,
    });
  }
}
