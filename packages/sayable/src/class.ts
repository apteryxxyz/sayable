import { IntlMessageFormat } from 'intl-messageformat';
import type { Descriptor } from './types.js';

export class Sayable {
  #locale: string | undefined;
  #messages: Record<string, Record<string, string>> = {};

  get locale() {
    if (this.#locale) return this.#locale;
    throw new Error('No locale is activated');
  }

  load(locale: string, messages: Record<string, string>) {
    this.#messages[locale] = messages;
    return this;
  }

  activate(locale: string) {
    this.#locale = locale;
    return this;
  }

  new(locale: string) {
    const sayings = new Sayable();
    sayings.load(locale, this.#messages[locale]!);
    sayings.activate(locale);
    return sayings as this;
  }

  say(descriptor: Descriptor) {
    const message = this.#messages[this.locale]![descriptor.id]!;
    const format = new IntlMessageFormat(message, this.locale);
    return String(format.format(descriptor as never) || '');
  }

  all(descriptor: Descriptor) {
    const locales = Object.keys(this.#messages);
    const localisations: Record<string, string> = {};
    for (const locale of locales) {
      const message = this.#messages[locale]![descriptor.id]!;
      const format = new IntlMessageFormat(message, locale);
      localisations[locale] = String(format.format(descriptor as never) || '');
    }
    return localisations;
  }
}
