import {
  Command,
  type CommandInteraction,
  Label,
  Modal,
  type ModalInteraction,
  TextInput,
  TextInputStyle,
} from '@buape/carbon';
import { sayable } from '@sayable/carbon';
import type { Sayable } from 'sayable';

export class AboutCommand extends sayable(Command) {
  constructor(say: Sayable) {
    super(say, (say) => ({
      name: say`about`,
      description: say`Tell me about yourself!`,
    }));
  }

  async run(interaction: CommandInteraction) {
    await interaction.showModal(new AboutModal(interaction.say));
  }
}

export class AboutModal extends sayable(Modal) {
  customId = 'about';

  constructor(say: Sayable) {
    super({
      title: say`About You`,
      components: [new NameLabel(say)],
    });
  }

  async run(interaction: ModalInteraction) {
    const name = interaction.fields.getText('name', true);

    return interaction.reply({
      content: interaction.say`Your name is ${name}!`,
    });
  }
}

class NameLabel extends sayable(Label) {
  constructor(say: Sayable) {
    super({ label: say`Name` }, new NameTextInput(say));
  }
}

class NameTextInput extends sayable(TextInput) {
  customId = 'name';
  constructor(say: Sayable) {
    super({
      placeholder: say`Your name`,
    });
  }
  override style = TextInputStyle.Short;
  override required = true;
}
