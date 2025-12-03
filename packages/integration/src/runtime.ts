import { mf1ToMessage } from '@messageformat/icu-messageformat-1';
import type {
  Awaitable,
  Disallow,
  NumeralOptions,
  SelectOptions,
} from './types.js';

export namespace SayKit {
  export type Messages = { [key: string]: string };
  export type Loader = (locale: string) => Awaitable<Messages>;
}

export interface SayKit {
  // ===== Macros ===== //

  /**
   * Define a message.
   *
   * @example
   * ```ts
   * say`Hello, ${name}!`
   * ```
   *
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  (strings: TemplateStringsArray, ...placeholders: unknown[]): string;

  /**
   * Provide a custom id or context for the message, the latter used to disambiguate
   * identical strings that have different meanings depending on usage.
   *
   * @example
   * ```ts
   * say({ context: 'direction' })`Right`
   * say({ context: 'correctness' })`Right`
   * ```
   *
   * @param descriptor Object containing optional `id` and `context` properties
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  (descriptor: { id?: string; context?: string }): SayKit;
}

export type ReadonlySayKit = SayKit & {
  [K in
    | 'load'
    | 'assign'
    | 'activate'
    | 'clone'
    | 'map'
    | 'reduce' as K]: never;
};

// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: false
export class SayKit {
  #loaders: Record<string, SayKit.Loader>;
  #cache: Map<string, SayKit.Messages>;
  #active: string | undefined;

  /**
   * Create a new SayKit instance.
   *
   * @param loaders A record of locale identifiers mapped to message loaders.
   */
  constructor(loaders: Record<string, SayKit.Loader>) {
    this.#loaders = loaders;
    this.#cache = new Map();
    this.#active = undefined;

    // Allow these properties to be spread into other objects
    Object.defineProperty(this, 'locale', {
      ...Object.getOwnPropertyDescriptor(SayKit.prototype, ' locale'),
      enumerable: true,
    });
    Object.defineProperty(this, 'locales', {
      ...Object.getOwnPropertyDescriptor(SayKit.prototype, ' locales'),
      enumerable: true,
    });
    Object.defineProperty(this, 'messages', {
      ...Object.getOwnPropertyDescriptor(SayKit.prototype, ' messages'),
      enumerable: true,
    });
  }

  /**
   * The currently active locale.
   *
   * @throws If no locale is active
   */
  declare locale: string;
  get ' locale'() {
    if (this.#active) return this.#active;
    throw new Error('No locale activated');
  }

  /**
   * All available locales.
   */
  declare locales: string[];
  get ' locales'() {
    return Object.keys(this.#loaders);
  }

  /**
   * Loads messages for the given locales.
   * If no locales are provided, all available locales are loaded.
   *
   * @param locales Locales to load messages for, defaults to {@link SayKit.locales}
   */
  async load(...locales: string[]) {
    if (Object.isFrozen(this))
      throw new TypeError('Cannot load messages for an immutable SayKit');
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
  assign(locale: string, messages: SayKit.Messages) {
    if (Object.isFrozen(this))
      throw new TypeError('Cannot assign messages to an immutable SayKit');
    this.#cache.set(locale, messages);
    this.#loaders[locale] = () => messages;
  }

  /**
   * Messages for the currently active locale.
   *
   * @throws If no locale is active
   * @throws If no messages are available for the active locale
   */
  declare messages: SayKit.Messages;
  get ' messages'() {
    if (this.#cache.has(this.locale)) return this.#cache.get(this.locale)!;
    throw new Error('No messages loaded for locale');
  }

  /**
   * Set the active locale.
   *
   * @param locale Locale to set
   * @returns This
   * @throws If locale is not available
   */
  activate(locale: string) {
    if (Object.isFrozen(this))
      throw new TypeError('Cannot change locale of an immutable SayKit');
    if (!this.#cache.has(locale))
      throw new Error(`No messages loaded for locale '${locale}'`);
    this.#active = locale;
    return this;
  }

  /**
   * Creates a clone of the SayKit instance, with the same locales and messages.
   *
   * @returns A clone of the SayKit instance
   */
  clone() {
    if (Object.isFrozen(this))
      throw new TypeError('Cannot clone an immutable SayKit');
    const clone = new SayKit(this.#loaders);
    clone.#cache = this.#cache;
    clone.#active = this.#active;
    return clone as this;
  }

  /**
   * Freezes the SayKit instance, preventing further modifications.
   *
   * @returns A readonly SayKit instance
   */
  freeze() {
    return Object.freeze(this) as unknown as ReadonlySayKit;
  }

  /**
   * Calls a defined callback function on each locale, passing the SayKit instance and locale to the callback.
   *
   * @param callback Callback function to call on each locale
   */
  map<T>(callback: (say: ReturnType<SayKit['freeze']>, locale: string) => T) {
    if (Object.isFrozen(this))
      throw new TypeError('Cannot map over an immutable SayKit');
    return this.locales.map((locale) => {
      const say = this.clone().activate(locale).freeze();
      return callback(say, locale);
    });
  }

  /**
   * Calls the specified callback function for all the elements in an array, passing the SayKit instance and locale to the callback.
   *
   * @param callback Callback function to call for each element
   * @param initial Initial value to use as the first argument to the first call of the callback
   */
  reduce<T>(
    callback: (
      say: ReturnType<SayKit['freeze']>,
      locale: string,
      accumulator: T,
    ) => T,
    initial: T,
  ) {
    if (Object.isFrozen(this))
      throw new TypeError('Cannot reduce over an immutable SayKit');
    return this.locales.reduce((acc, locale) => {
      const say = this.clone().activate(locale).freeze();
      return callback(say, locale, acc);
    }, initial);
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
    messages: SayKit.Messages,
    descriptor: Parameters<SayKit['call']>[0],
  ) {
    const message = messages[descriptor.id];
    if (!message) throw new Error(`Descriptor '${descriptor.id}' not found`);

    if (typeof message !== 'string')
      throw new Error(`Descriptor '${descriptor.id}' is not a string`);

    const format = mf1ToMessage(locale, message);
    return String(format.format(descriptor));
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

  // ===== Macros ===== //

  /**
   * Define a pluralised message.
   *
   * @example
   * ```ts
   * say.plural(count, {
   *   one: 'You have 1 item',
   *   other: 'You have # items',
   * })
   * ```
   *
   * The `#` symbol inside options is replaced with the numeric value.
   * @param _ Number to determine the plural form of
   * @param options Pluralisation rules keyed by CLDR categories or specific numbers
   * @returns The plural form of the number
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  plural(
    _: number,
    options: Disallow<NumeralOptions, 'id' | 'context'>,
  ): string {
    void _;
    void options;
    throw new Error(
      "'SayKit#plural' is a macro and must be used with the relevant saykit plugin",
    );
  }

  /**
   * Define an ordinal message (e.g. "1st", "2nd", "3rd").
   * The `#` symbol inside options is replaced with the numeric value.
   *
   * @example
   * ```ts
   * say.ordinal(position, {
   *   1: '#st',
   *   2: '#nd',
   *   3: '#rd',
   *   other: '#th',
   * })
   * ```
   *
   * @param _ Number to determine the ordinal form of
   * @param options Ordinal rules keyed by CLDR categories or specific numbers
   * @returns The ordinal form of the number
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  ordinal(
    _: number,
    options: Disallow<NumeralOptions, 'id' | 'context'>,
  ): string {
    void _;
    void options;
    throw new Error(
      "'SayKit#ordinal' is a macro and must be used with the relevant saykit plugin",
    );
  }

  /**
   * Define a select message, useful for handling gender, status, or other categories.
   *
   * @example
   * ```ts
   * say.select(gender, {
   *   male: 'He',
   *   female: 'She',
   *   other: 'They',
   * })
   * ```
   *
   * @param _ Selector value to determine which option is chosen
   * @param options A mapping of possible selector values to message strings
   * @returns The select form of the value
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  select(
    _: string,
    options: Disallow<SelectOptions, 'id' | 'context'>,
  ): string {
    void _;
    void options;
    throw new Error(
      "'SayKit#select' is a macro and must be used with the relevant saykit plugin",
    );
  }
}

export * from './types.js';
