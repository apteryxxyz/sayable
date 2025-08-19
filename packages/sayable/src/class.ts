import { IntlMessageFormat } from 'intl-messageformat';
import type { Descriptor } from './types.js';

export class Sayable {
  #locale: string | undefined;
  #messages: Record<string, Record<string, string>> = {};

  get locale() {
    if (this.#locale) return this.#locale;
    throw new Error('No locale set');
  }

  load(locale: string, messages: Record<string, string>) {
    this.#locale = locale;
    this.#messages[locale] = messages;
    return this;
  }

  activate(locale: string) {
    this.#locale = locale;
    return this;
  }

  say(descriptor: Descriptor) {
    const message = this.#messages[this.locale]![descriptor.id]!;
    const format = new IntlMessageFormat(message, this.locale);
    return String(format.format(descriptor as never) || '');
  }
}
