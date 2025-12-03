import {
  Command,
  type CommandInteraction,
  Label,
  Modal,
  type ModalInteraction,
  TextInput,
  TextInputStyle,
} from '@buape/carbon';
import { saykit } from '@saykit/carbon';
import type { SayKit } from 'saykit';

export class AboutCommand extends saykit(Command) {
  constructor(say: SayKit) {
    super(say, (say) => ({
      name: say`about`,
      description: say`Tell me about yourself!`,
    }));
  }

  async run(interaction: CommandInteraction) {
    await interaction.showModal(new AboutModal(interaction.say));
  }
}

export class AboutModal extends saykit(Modal) {
  customId = 'about';

  constructor(say: SayKit) {
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

class NameLabel extends saykit(Label) {
  constructor(say: SayKit) {
    super({ label: say`Name` }, new NameTextInput(say));
  }
}

class NameTextInput extends saykit(TextInput) {
  customId = 'name';
  constructor(say: SayKit) {
    super({
      placeholder: say`Your name`,
    });
  }
  override style = TextInputStyle.Short;
  override required = true;
}
