import {
  Command,
  type CommandInteraction,
  Label,
  Modal,
  type ModalInteraction,
  TextInput,
  TextInputStyle,
} from '@buape/carbon';
import { withSay } from '@saykit/carbon';
import type { Catalogue, View } from 'saykit';
import { currentPick } from '../club.js';

export class JoinCommand extends withSay(Command) {
  constructor(catalogue: Catalogue) {
    super(catalogue, (say) => ({
      name: say`join`,
      description: say`Sign up for this month's book.`,
    }));
  }

  async run(interaction: CommandInteraction) {
    await interaction.showModal(new JoinModal(interaction.say));
  }
}

export class JoinModal extends withSay(Modal) {
  customId = 'join';

  constructor(say: View) {
    super({
      title: say`Join the book club`,
      components: [new PaceLabel(say)],
    });
  }

  async run(interaction: ModalInteraction) {
    const say = interaction.say;
    const raw = interaction.fields.getText('pace', true);
    const pace = Number.parseInt(raw, 10);

    if (Number.isNaN(pace) || pace <= 0) {
      await interaction.reply({
        content: say`"${raw}" is not a number of pages. Try again?`,
        ephemeral: true,
      });
      return;
    }

    const days = Math.ceil(currentPick.pages / pace);

    await interaction.reply({
      content: say`At ${say.plural(pace, {
        one: `${pace} page`,
        other: `${pace} pages`,
      })} a day you will finish ${currentPick.title} in ${say.plural(days, {
        one: `${days} day`,
        other: `${days} days`,
      })}.`,
      ephemeral: true,
    });
  }
}

class PaceLabel extends withSay(Label) {
  constructor(say: View) {
    super({ label: say`Pages per day` }, new PaceTextInput(say));
  }
}

class PaceTextInput extends withSay(TextInput) {
  customId = 'pace';

  constructor(say: View) {
    super({ placeholder: say`e.g. 20` });
  }

  override style = TextInputStyle.Short;
  override required = true;
}
