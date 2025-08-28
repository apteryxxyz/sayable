import { IntlMessageFormat } from 'intl-messageformat';
import type { Awaitable, Resolvable } from './types.js';
import { resolve } from './types.js';

class Sayable<Translations extends Sayable.Translations> {
  #locale: keyof Translations | undefined;
  #translations: Translations;

  constructor(translations: NoInfer<Translations>) {
    this.#locale = undefined;
    this.#translations = translations;
  }

  get locale() {
    if (this.#locale) return this.#locale;
    throw new Error('No locale activated');
  }

  messages(locale: keyof Translations) {
    if (!this.#translations[locale])
      throw new Error(`No messages for locale '${String(locale)}'`);

    const messages = resolve(this.#translations[locale]);
    Reflect.set(this.#translations, locale, messages);
    return messages;
  }

  preload(
    locale: keyof Translations,
    messages: Sayable.Messages,
  ): Sayable.Messages;
  preload(
    locale: keyof Translations,
    messages?: Promise<Sayable.Messages>,
  ): Promise<Sayable.Messages>;
  preload(
    locale: keyof Translations,
    messages = this.messages(locale),
  ): Awaitable<Sayable.Messages> {
    if (messages instanceof Promise) {
      return messages.then((messages) => this.preload(locale, messages));
    } else {
      Reflect.set(this.#translations, locale, messages);
      return messages;
    }
  }

  activate(locale: keyof Translations) {
    this.preload(locale);
    this.#locale = locale;
  }

  say(descriptor: Sayable.Descriptor) {
    const messages = this.messages(this.locale);
    if (messages instanceof Promise)
      throw new Error(
        `Messages for locale '${String(this.locale)}' not loaded`,
      );

    const message = (messages as Sayable.Messages)[descriptor.id];
    if (message === undefined)
      throw new Error(`Message '${String(descriptor.id)}' not found`);

    const format = new IntlMessageFormat(message, String(this.locale));
    return String(format.format(descriptor as never));
  }
}

namespace Sayable {
  export type Translations = Record<string, Resolvable<Messages>>;
  export type Messages = Record<string, string>;
  export type Descriptor = import('./types.js').Descriptor;
}

export default Sayable;
