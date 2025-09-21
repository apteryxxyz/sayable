import { IntlMessageFormat } from 'intl-messageformat';
import type { Awaitable } from './types.js';

export namespace Sayable {
  export type Messages = Record<string, string>;
  export type Loader = (locale: string) => Awaitable<Messages>;
}

export class Sayable {
  #loaders: Record<string, Sayable.Loader>;
  #cache: Map<string, Sayable.Messages>;
  #active: string | undefined;

  constructor(loaders: Record<string, Sayable.Loader>) {
    this.#loaders = loaders;
    this.#cache = new Map();
    this.#active = undefined;
  }

  get locale() {
    if (this.#active) return this.#active;
    throw new Error('No locale activated');
  }

  get locales() {
    return Object.keys(this.#loaders);
  }

  async load(...locales: string[]) {
    if (locales.length === 0) locales = this.locales;
    for (const locale of locales) {
      if (this.#cache.has(locale)) continue;
      const messages = await this.#loaders[locale]?.(locale);
      if (messages) this.assign(locale, messages);
    }
  }

  assign(locale: string, messages: Sayable.Messages) {
    this.#cache.set(locale, messages);
    this.#loaders[locale] = () => messages;
  }

  get messages() {
    if (this.#cache.has(this.locale)) return this.#cache.get(this.locale)!;
    throw new Error('No messages for locale');
  }

  activate(locale: string) {
    if (!this.locales.includes(locale))
      throw new Error(`No loader for locale '${locale}'`);
    this.#active = locale;
    return this;
  }

  freeze() {
    type ReadonlySayable = Omit<typeof this, 'load' | 'assign' | 'activate'>;
    return Object.freeze(this) as ReadonlySayable;
  }

  clone() {
    const clone = new Sayable(this.#loaders);
    clone.#cache = this.#cache;
    clone.#active = this.#active;
    return clone as this;
  }

  call(descriptor: { id: string; [key: string | number]: unknown }) {
    return this.#call(this.locale, this.messages, descriptor);
  }

  #call(
    locale: string,
    messages: Sayable.Messages,
    descriptor: Parameters<Sayable['call']>[0],
  ) {
    const message = messages[descriptor.id];
    if (!message) throw new Error(`Descriptor '${descriptor.id}' not found`);

    if (typeof message !== 'string')
      throw new Error(`Descriptor '${descriptor.id}' is not a string`);

    const format = new IntlMessageFormat(message, locale);
    return String(format.format(descriptor as never));
  }

  [Symbol.for('nodejs.util.inspect.custom')](
    _depth: number,
    options: import('node:util').InspectOptionsStylized,
    inspect: typeof import('node:util').inspect,
  ) {
    return `${this.constructor.name} ${inspect(
      {
        locales: Object.keys(this.#loaders),
        locale: this.#active,
        messages: options.stylize('messages', 'special'),
      },
      options,
    )}`;
  }
}

export * from './types.js';
