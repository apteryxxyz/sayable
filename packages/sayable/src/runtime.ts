import { IntlMessageFormat } from 'intl-messageformat';
import type { Awaitable } from './types.js';

class Sayable<Locale extends string> {
  #loaders: Sayable.Loaders<Locale>;
  #cache: Partial<Record<Locale, Sayable.Messages>> = {};
  #active: Locale | undefined = undefined;

  constructor(loaders: Sayable.Loaders<Locale>) {
    this.#loaders = loaders;
  }

  get locale() {
    if (this.#active) return this.#active;
    throw new Error('No locale activated');
  }

  get locales() {
    return Object.keys(this.#loaders) as Locale[];
  }

  async load(...locales: Locale[]) {
    if (locales.length === 0) locales = this.locales;
    for (const locale of locales) {
      if (this.#cache[locale]) continue;
      let messages = await this.#loaders[locale]();
      if ('default' in messages)
        messages = messages.default as Sayable.Messages;
      this.assign(locale, messages);
    }
  }

  assign(locale: Locale, messages: Sayable.Messages) {
    this.#cache[locale] = messages;
  }

  get messages() {
    if (this.#cache[this.locale]) return this.#cache[this.locale]!;
    throw new Error(`Messages for locale '${this.locale}' not loaded`);
  }

  activate(locale: Locale) {
    if (!(locale in this.#loaders))
      throw new Error(`No loader for locale '${locale}'`);
    this.#active = locale;
    return this;
  }

  clone(): this {
    const cloned = new Sayable(this.#loaders) as this;
    cloned.#active = this.#active;
    cloned.#cache = this.#cache;
    return cloned;
  }

  say(descriptor: Sayable.Descriptor) {
    return this.#say(this.locale, this.messages, descriptor);
  }

  #say(
    locale: Locale,
    messages: Sayable.Messages,
    descriptor: Sayable.Descriptor,
  ) {
    const message = messages[descriptor.id];
    if (!message) throw new Error(`Descriptor '${descriptor.id}' not found`);

    if (typeof message !== 'string')
      throw new Error(`Descriptor '${descriptor.id}' is not a string`);

    const format = new IntlMessageFormat(message, locale);
    return String(format.format(descriptor as never));
  }
}

namespace Sayable {
  export type Messages = Record<string, string>;
  export type Loaders<Locale extends string = string> = //
    Record<Locale, () => Awaitable<Messages | { default: Messages }>>;
  export type Descriptor = import('./types.js').Descriptor;
}

export default Sayable;
