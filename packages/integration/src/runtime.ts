import { IntlMessageFormat } from 'intl-messageformat';
import type { Awaitable } from './types.js';

export namespace Sayable {
  export type Messages = { [key: string]: string };
  export type Loader = (locale: string) => Awaitable<Messages>;
}

/**
 * Sayable manages localised message loading, activation, and formatting.
 */
export class Sayable {
  #loaders: Record<string, Sayable.Loader>;
  #cache: Map<string, Sayable.Messages>;
  #active: string | undefined;

  /**
   * Create a new Sayable instance.
   *
   * @param loaders A record of locale identifiers mapped to message loaders.
   */
  constructor(loaders: Record<string, Sayable.Loader>) {
    this.#loaders = loaders;
    this.#cache = new Map();
    this.#active = undefined;

    // Allow these properties to be spread into other objects
    // TODO: Improve error messages, will be done all at once later
    Object.defineProperty(this, 'locale', {
      get: () => {
        if (this.#active) return this.#active;
        throw new Error('No locale activated');
      },
      set: () => {
        throw new TypeError('`locale` is read-only');
      },
      enumerable: true,
    });
    Object.defineProperty(this, 'locales', {
      get: () => {
        return Object.keys(this.#loaders);
      },
      set: () => {
        throw new TypeError('`locales` is read-only');
      },
      enumerable: true,
    });
    Object.defineProperty(this, 'messages', {
      get: () => {
        if (this.#cache.has(this.locale)) return this.#cache.get(this.locale)!;
        throw new Error('No messages loaded for locale');
      },
      set: () => {
        throw new TypeError('`messages` is read-only');
      },
      enumerable: true,
    });
  }

  /**
   * The currently active locale.
   *
   * @throws If no locale is active
   */
  declare locale: string;

  /**
   * All available locales.
   */
  declare locales: string[];

  /**
   * Loads messages for the given locales.
   * If no locales are provided, all available locales are loaded.
   *
   * @param locales Locales to load messages for, defaults to {@link Sayable.locales}
   */
  async load(...locales: string[]) {
    if (locales.length === 0) locales = this.locales;
    for (const locale of locales) {
      if (this.#cache.has(locale)) continue;
      const messages = await this.#loaders[locale]?.(locale);
      if (messages) this.assign(locale, messages);
    }
  }

  /**
   * Manually assign messages to a locale.
   *
   * @param locale Locale to assign messages to
   * @param messages Messages to assign
   */
  assign(locale: string, messages: Sayable.Messages) {
    this.#cache.set(locale, messages);
    this.#loaders[locale] = () => messages;
  }

  /**
   * Messages for the currently active locale.
   *
   * @throws If no locale is active
   * @throws If no messages are available for the active locale
   */
  declare messages: Sayable.Messages;

  /**
   * Set the active locale.
   *
   * @param locale Locale to set
   * @returns This
   * @throws If locale is not available
   */
  activate(locale: string) {
    if (!this.locales.includes(locale))
      throw new Error(`No loader for locale '${locale}'`);
    this.#active = locale;
    return this;
  }

  /**
   * Freezes the Sayable instance, preventing further modifications.
   *
   * @returns A readonly Sayable instance
   */
  freeze() {
    type ReadonlySayable = Omit<typeof this, 'load' | 'assign' | 'activate'>;
    return Object.freeze(this) as ReadonlySayable;
  }

  /**
   * Creates a clone of the Sayable instance, with the same locales and messages.
   *
   * @returns A clone of the Sayable instance
   */
  clone() {
    const clone = new Sayable(this.#loaders);
    clone.#cache = this.#cache;
    clone.#active = this.#active;
    return clone as this;
  }

  /**
   * Get the translation for a descriptor.
   *
   * @param descriptor Descriptor to get the translation for
   * @returns The translation string for the descriptor
   * @throws If no locale is active
   * @throws If no messages are available for the active locale
   */
  call(descriptor: { id: string; [key: string | number]: unknown }) {
    return this.#call(this.locale, this.messages, descriptor);
  }

  /**
   * Get the translation for a descriptor.
   *
   * @param locale Relevant locale
   * @param messages Relevant messages
   * @param descriptor Descriptor to get the translation for
   * @returns The translation string for the descriptor
   */
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
    if (this.#active)
      return `${this.constructor.name}<${inspect(this.#active, options)}> {}`;
    else return `${this.constructor.name} {}`;
  }
}

export * from './types.js';
