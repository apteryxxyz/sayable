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

/**
 * `/pick` — what the club is reading, and when it meets.
 *
 * The `withSay(Command)` constructor takes `(catalogue, properties)` where
 * `properties` is called **once per locale**, with that locale's view. Its return value is merged into
 * Discord's `name_localizations` / `description_localizations`, so the command
 * shows up in a French user's client as `/choix` without a second registration.
 */
export class PickCommand extends withSay(Command) {
  constructor(catalogue: Catalogue) {
    super(catalogue, (say) => ({
      name: say`pick`,
      description: say`See what the club is reading right now.`,
    }));
  }

  async run(interaction: CommandInteraction) {
    // `interaction.say` is the immutable view for the locale Discord reported
    // for *this user*. Nothing can change it, so it is safe to use concurrently.
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

/**
 * A component, not a command. The component overload of `withSay` takes just
 * `(properties)` — components are not registered with Discord ahead of time, so
 * there is no set of localisations to build, only the one label for the user
 * who is looking at it.
 */
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
