import { datetime, duration, number, plural } from './runtime.js';

/**
 * A compiled message.
 *
 * The CLI compiles a catalogue's messages down to this: arrays and strings,
 * with every style already resolved to the options bag it stands for. Nothing
 * here is parsed at runtime, and nothing here is a function, so a locale's
 * messages are data - they cross a server/client boundary the way any other
 * JSON does, which a compiled function cannot.
 *
 * A message with no placeholders is its own string, so the common case costs
 * nothing at all.
 */
export type Message =
  // Literal text, or a literal number a branch compares against
  | string
  | number
  // Concatenation: the parts of one message, in order
  | ['c', ...Message[]]
  // A value from the descriptor, by key
  | ['v', string]
  // A runtime helper over one value, with the options it was compiled with
  | ['f', Message.Helper, Message, unknown?]
  // A conditional: test, then, else
  | ['?', Message, Message, Message]
  // Equality between two nodes
  | ['=', Message, Message]
  // Subtraction, for a plural offset
  | ['-', Message, Message]
  // Multiplication, for a number scale
  | ['*', Message, Message]
  // String coercion, for a select matching its cases as text
  | ['s', Message];

export namespace Message {
  /** The helpers a compiled message may call. */
  export type Helper = 'number' | 'datetime' | 'duration' | 'plural';

  /** What a compiled message is called with: the descriptor the transform built. */
  export type Values = Record<string, unknown>;
}

/**
 * The helpers, by the name a message calls them under.
 *
 * Uniform on purpose: every one takes the locale, the value, and whatever
 * options it was compiled with, so `'f'` is one call shape rather than four.
 */
const HELPERS: Record<Message.Helper, (locale: string, value: never, options: never) => unknown> = {
  number: number as never,
  datetime: datetime as never,
  plural: plural as never,
  // The one helper with nothing locale-dependent about it
  duration: ((_locale: string, value: number) => duration(value)) as never,
};

type Formatter = (values: Message.Values) => unknown;

/**
 * Build the closure one node evaluates to.
 *
 * The walk happens once per message, and every branch of it resolves what it
 * can while it walks: a helper is looked up here rather than per call, and so
 * are a conditional's arms. What is left at call time is the work that depends
 * on the values.
 */
function build(node: Message, locale: string): Formatter {
  if (!Array.isArray(node)) return () => node;

  switch (node[0]) {
    case 'c': {
      const parts = node.slice(1).map((part) => build(part as Message, locale));
      return (values) => {
        let written = '';
        for (const part of parts) written += part(values) ?? '';
        return written;
      };
    }

    case 'v': {
      const key = node[1];
      return (values) => values[key];
    }

    case 'f': {
      const helper = HELPERS[node[1]];
      const value = build(node[2], locale);
      const options = node[3];
      return (values) => helper(locale, value(values) as never, options as never);
    }

    case '?': {
      const test = build(node[1], locale);
      const then = build(node[2], locale);
      const otherwise = build(node[3], locale);
      return (values) => (test(values) ? then(values) : otherwise(values));
    }

    case '=': {
      const left = build(node[1], locale);
      const right = build(node[2], locale);
      return (values) => left(values) === right(values);
    }

    case '-': {
      const left = build(node[1], locale);
      const right = build(node[2], locale);
      return (values) => (left(values) as number) - (right(values) as number);
    }

    case '*': {
      const left = build(node[1], locale);
      const right = build(node[2], locale);
      return (values) => (left(values) as number) * (right(values) as number);
    }

    default: {
      const value = build(node[1], locale);
      return (values) => String(value(values));
    }
  }
}

/**
 * Compile one message into the function that formats it.
 *
 * Called once per message per locale: a view memoises what this returns, so a
 * message walked here is called from the closure afterwards.
 *
 * @param message The compiled message, as the CLI emitted it
 * @param locale The locale to bind its helpers to
 * @returns A function from a descriptor to the formatted string
 */
export function compileMessage(
  message: Message,
  locale: string,
): (values: Message.Values) => string {
  // A message with no placeholders is already its own answer
  if (typeof message === 'string') return () => message;

  const formatter = build(message, locale);
  return (values) => String(formatter(values) ?? '');
}
