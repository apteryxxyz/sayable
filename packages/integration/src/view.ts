import { compileMessage, type Message } from './message.js';
import type {
  DateTimeOptions,
  Disallow,
  Named,
  NumberOptions,
  NumeralOptions,
  SelectOptions,
} from './types.js';

function macro(name: string): never {
  throw new Error(`'say.${name}' is a macro and must be used with the relevant saykit plugin`);
}

export namespace View {
  /**
   * One locale's messages, compiled.
   *
   * Each is a {@link Message} the CLI compiled from the catalogue, with every
   * style already resolved. Being data rather than code, a locale's messages
   * serialise, which is what lets a server hand them to a client tree.
   */
  export type Messages = { [key: string]: Message };
}

/**
 * One locale, bound to the messages it formats against.
 *
 * Callable, immutable and memoised: `catalogue.locale('en')` hands back the
 * same value every time. A view has no reference back to its catalogue and so
 * cannot switch locale; switching belongs to whoever owns the catalogue.
 */
export interface View<Locale extends string = string> {
  // ===== Macros ===== //

  /**
   * Define a message.
   *
   * An interpolated variable is named after itself. Anything else is numbered,
   * unless written as a single-key object, which names it.
   *
   * @example
   * ```ts
   * say`Hello, ${name}!`
   * say`Your total is ${{ cartTotal: getCartTotal() }}`
   * ```
   *
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  (strings: TemplateStringsArray, ...placeholders: unknown[]): string;

  /**
   * Give the message a custom id, or a context to disambiguate identical
   * strings that mean different things.
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
  (descriptor: { id?: string; context?: string }): View<Locale>;

  /** The locale this view is bound to. */
  readonly locale: Locale;

  /** The messages this view formats against. */
  readonly messages: Readonly<View.Messages>;

  /**
   * Format the message a descriptor names.
   *
   * @param descriptor Descriptor to format
   * @returns The formatted message
   * @throws If the id has no message
   */
  call(descriptor: { id: string; [match: string | number]: unknown }): string;

  /**
   * Define a pluralised message.
   *
   * Interpolating the selector into a branch extracts as ICU's `#`. A `#` you
   * write yourself is text.
   *
   * @example
   * ```ts
   * say.plural(count, {
   *   one: 'You have 1 item',
   *   other: `You have ${count} items`,
   * })
   * ```
   *
   * @param _ Number to determine the plural form of
   * @param options Pluralisation rules keyed by CLDR categories or specific numbers
   * @returns The plural form of the number
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  plural(_: number | Named<number>, options: Disallow<NumeralOptions, 'id' | 'context'>): string;

  /**
   * Define an ordinal message ("1st", "2nd", "3rd").
   *
   * Interpolating the selector into a branch extracts as ICU's `#`. A `#` you
   * write yourself is text.
   *
   * @example
   * ```ts
   * say.ordinal(position, {
   *   1: `${position}st`,
   *   2: `${position}nd`,
   *   3: `${position}rd`,
   *   other: `${position}th`,
   * })
   * ```
   *
   * @param _ Number to determine the ordinal form of
   * @param options Ordinal rules keyed by CLDR categories or specific numbers
   * @returns The ordinal form of the number
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  ordinal(_: number | Named<number>, options: Disallow<NumeralOptions, 'id' | 'context'>): string;

  /**
   * Define a select message, for gender, status, or other categories.
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
    _: string | number | Named<string | number>,
    options: Disallow<SelectOptions, 'id' | 'context'>,
  ): string;

  /**
   * Format a number the way this view's locale writes one, with its own
   * grouping separators and decimal mark.
   *
   * Unlike `plural`, `ordinal` and `select`, this is a fragment rather than a
   * whole message, and is normally written inside one.
   *
   * @example
   * ```ts
   * say`You have ${say.number(items.length)} items`
   * say`Battery at ${say.number(level, { style: 'percent' })}`
   * say`Total: ${say.number({ cartTotal: getTotal() }, { style: '#,##0.00' })}`
   * say`Total: ${say.number(total, { style: '::currency/EUR' })}`
   * ```
   *
   * @param _ Number to format
   * @param options Formatting style: a named style, an ICU skeleton such as
   *   `::currency/EUR`, or a pattern such as `#,##0.00`
   * @returns The formatted number
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  number(_: number | Named<number>, options?: Disallow<NumberOptions, 'id' | 'context'>): string;

  /**
   * Format the date portion of a value the way this view's locale writes one.
   *
   * @example
   * ```ts
   * say`Published ${say.date(post.publishedAt)}`
   * say`Published ${say.date(post.publishedAt, { style: 'full' })}`
   * say`Published ${say.date(post.publishedAt, { style: '::yMMMM' })}`
   * ```
   *
   * @param _ Date to format
   * @param options A named style or an ICU skeleton such as `::yyyyMMdd`
   * @returns The formatted date
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  date(
    _: Date | number | Named<Date | number>,
    options?: Disallow<DateTimeOptions, 'id' | 'context'>,
  ): string;

  /**
   * Format the time portion of a value the way this view's locale writes one.
   *
   * @example
   * ```ts
   * say`Doors open at ${say.time(opensAt)}`
   * say`Doors open at ${say.time(opensAt, { style: 'short' })}`
   * say`Doors open at ${say.time(opensAt, { style: '::Hm' })}`
   * ```
   *
   * @param _ Date to format
   * @param options A named style or an ICU skeleton such as `::Hm`
   * @returns The formatted time
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  time(
    _: Date | number | Named<Date | number>,
    options?: Disallow<DateTimeOptions, 'id' | 'context'>,
  ): string;
}

/**
 * Create a view over one locale and the messages it formats against.
 *
 * A catalogue memoises one per locale, which is how application code usually
 * reaches one; a single-locale app can build one directly.
 *
 * @param locale The locale to bind to
 * @param messages The messages this view formats against
 * @returns The view
 */
export function createView<Locale extends string>(
  locale: Locale,
  messages: View.Messages,
): View<Locale> {
  // Copied and frozen, so nothing can swap a message out from under the view
  // that is already handing its result to callers
  const own: View.Messages = Object.freeze({ ...messages });

  const say = (() => {
    throw new Error("'say' is a macro and must be used with the relevant saykit plugin");
  }) as unknown as View<Locale>;

  // One compile per message, on the first call that needs it. A message nobody
  // renders is never walked, and one rendered a thousand times is walked once
  const compiled = new Map<string, (values: Message.Values) => string>();

  function call(descriptor: { id: string; [match: string | number]: unknown }) {
    let format = compiled.get(descriptor.id);

    if (!format) {
      const message = own[descriptor.id];
      if (message === undefined)
        throw new Error(`No message for ${descriptor.id} in locale '${locale}'`);

      compiled.set(descriptor.id, (format = compileMessage(message, locale)));
    }

    return format(descriptor);
  }

  return Object.freeze(
    Object.defineProperties(say, {
      locale: { value: locale, enumerable: true },
      messages: { value: own, enumerable: true },
      // Own, so it shadows `Function.prototype.call`: the transform compiles
      // every message down to `say.call({ id, ... })`
      call: { value: call },
      plural: { value: () => macro('plural') },
      ordinal: { value: () => macro('ordinal') },
      select: { value: () => macro('select') },
      number: { value: () => macro('number') },
      date: { value: () => macro('date') },
      time: { value: () => macro('time') },
      [Symbol.for('nodejs.util.inspect.custom')]: {
        value: (
          _depth: number,
          context: import('node:util').InspectContext,
          inspect: typeof import('node:util').inspect,
        ) => `View<${inspect(locale, context)}> {}`,
      },
    }),
  );
}
