import { BaseCommand, BaseComponent, Modal } from '@buape/carbon';
import { type Catalogue, createCatalogue, type View } from 'saykit';
import { describe, expect, it } from 'vitest';
import { withSay } from './with-say.js';

const catalogue = () => createCatalogue({ locales: ['en', 'fr'], messages: { en: {}, fr: {} } });

describe('withSay', () => {
  it('throws for a base class that is neither a command nor a component', () => {
    class Plain {}
    expect(() => withSay(Plain as never)).toThrow('Invalid base class');
  });

  it('caches the derived class per base class', () => {
    class Cmd extends BaseCommand {
      name = 'cmd';
      override description = 'desc';
      type = 1 as never;
      serializeOptions() {
        return undefined;
      }
      async run() {}
    }
    const A = withSay(Cmd);
    const B = withSay(Cmd);
    expect(A).toBe(B);
  });

  it('builds a command with localizations from every locale', () => {
    class Cmd extends BaseCommand {
      name = 'placeholder';
      override description = 'placeholder';
      type = 1 as never;
      serializeOptions() {
        return undefined;
      }
      async run() {}
    }
    const SayCommand = withSay(Cmd) as unknown as new (
      catalogue: Catalogue,
      props: (s: View) => { name: string; description: string },
    ) => { name: string; description: string } & Record<string, unknown>;

    const command = new SayCommand(catalogue(), (s) => ({
      name: `name-${s.locale}`,
      description: `desc-${s.locale}`,
    }));

    expect(command.name).toBe('name-en');
    expect((command.name_localizations as Record<string, string>).fr).toBe('name-fr');
  });

  it('builds a component and assigns the given properties', () => {
    class Button extends BaseComponent {
      customId = 'btn';
      readonly type = 2 as never;
      readonly isV2 = false;
      serialize = () => ({}) as never;
    }
    const SayButton = withSay(Button) as unknown as new (props?: {
      label?: string;
    }) => Record<string, unknown>;

    expect(new SayButton({ label: 'Click' }).label).toBe('Click');
    // Constructed without properties — nothing is assigned.
    expect(new SayButton().label).toBeUndefined();
  });

  it('treats Modal as a component base', () => {
    const SayModal = withSay(Modal);
    expect(SayModal.prototype).toBeInstanceOf(Modal);
  });
});
