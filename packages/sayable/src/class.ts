import IntlMessageFormat from 'intl-messageformat';
import type { Descriptor } from './types.js';

export class Sayable {
  #locale: string | undefined = undefined;
  #messages: Record<string, Record<string, string>> = {};

  get locale() {
    if (this.#locale) return this.#locale;
    throw new Error('No locale activated');
  }

  load(locale: string, messages: Record<string, string>) {
    this.#messages[locale] = messages;
    return this;
  }

  activate(locale: string) {
    this.#locale = locale;
    return this;
  }

  fork(locale = this.locale) {
    const say = new Sayable();
    say.activate(locale);
    return say;
  }

  say(descriptor: Descriptor) {
    const messages = this.#messages[this.locale];
    if (!messages) throw new Error('No messages for locale');
    const message = messages[descriptor.id];
    if (!message) throw new Error('No message for id');
    const format = new IntlMessageFormat(message, this.locale);
    return String(format.format(descriptor as never) || '');
  }
}
