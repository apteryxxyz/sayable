import { IntlMessageFormat } from 'intl-messageformat';
import type { Awaitable } from './types.js';

export namespace Sayable {
  export type Messages = Record<string, string>;
  export type Loaders<Locale extends string> = //
    Record<Locale, () => Awaitable<Messages | { default: Messages }>>;
}

export class Sayable<Locale extends string> {
  #loaders: Sayable.Loaders<Locale>;
  #cache: Map<Locale, Sayable.Messages>;
  #active: Locale | undefined;

  constructor(loaders: Sayable.Loaders<Locale>) {
    this.#loaders = loaders;
    this.#cache = new Map();
    this.#active = undefined;
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
      if (this.#cache.has(locale)) continue;
      let messages = await this.#loaders[locale]();
      if ('default' in messages)
        messages = messages.default as Sayable.Messages;
      this.assign(locale, messages);
    }
  }

  assign(locale: Locale, messages: Sayable.Messages) {
    this.#cache.set(locale, messages);
    this.#loaders[locale] = () => messages;
  }

  get messages() {
    if (this.#cache.has(this.locale)) return this.#cache.get(this.locale)!;
    throw new Error('No messages for locale');
  }

  activate(locale: Locale) {
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
    locale: Locale,
    messages: Sayable.Messages,
    descriptor: Parameters<Sayable<Locale>['call']>[0],
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
