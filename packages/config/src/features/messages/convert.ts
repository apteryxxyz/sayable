import { getBranchCase } from './identifier.js';
import {
  ArgumentMessage,
  ChoiceMessage,
  CompositeMessage,
  ElementMessage,
  LiteralMessage,
  type Message,
} from './types.js';

/**
 * Quote the characters ICU reads as syntax, so text a message means literally
 * arrives as text rather than as an argument the catalogue never declared.
 *
 * A brace is quoted as `'{'`, which is ICU's own escape. An apostrophe is the
 * character doing that quoting, so it is doubled — but only where ICU would
 * otherwise read it as opening a quote, which is in front of a brace or
 * another apostrophe. Everywhere else it is already literal, and doubling it
 * would rewrite the id of every message that contains one.
 *
 * `#` is deliberately left alone: inside a plural it is the number being
 * formatted, which is the whole point of writing it.
 */
function escapeIcuLiteral(text: string) {
  let escaped = '';

  for (let i = 0; i < text.length; i++) {
    const character = text[i]!;

    if (character === '{' || character === '}') {
      // One quoted run for a whole stretch of braces, so `{{` is `'{{'`.
      const start = i;
      while (text[i + 1] === '{' || text[i + 1] === '}') i++;
      escaped += `'${text.slice(start, i + 1)}'`;
    } else if (character === "'" && /['{}]/.test(text[i + 1] ?? '')) {
      escaped += "''";
    } else {
      escaped += character;
    }
  }

  return escaped;
}

export function convertMessageToIcu(message: Message) {
  function internalConvertMessageToIcu(message: Message): string {
    switch (true) {
      case message instanceof LiteralMessage:
        return escapeIcuLiteral(String(message.text));

      case message instanceof ArgumentMessage: {
        const parts = [String(message.identifier)];
        if (message.format) parts.push(message.format.type);
        if (message.format?.style) parts.push(message.format.style);
        return `{${parts.join(', ')}}`;
      }

      case message instanceof ElementMessage: {
        // A childless element is self-closing, so a translator has nowhere to
        // insert content that the element never expected. This tracks the
        // source: an element written as a pair stays a pair, even when its
        // children happen to render to nothing.
        if (message.children.length === 0) return `<${String(message.identifier)}/>`;
        const children = message.children.map((m) => internalConvertMessageToIcu(m)).join('');
        return `<${String(message.identifier)}>${children}</${String(message.identifier)}>`;
      }

      case message instanceof ChoiceMessage: {
        const branches = message.branches
          .map(({ identifier, value }) => ({
            identifier: getBranchCase(message.kind, identifier),
            value: internalConvertMessageToIcu(value),
          }))
          .map(({ identifier, value }) => `  ${identifier} {${value}}\n`)
          .join('');
        const format = message.kind === 'ordinal' ? 'selectordinal' : message.kind;
        // `select` matches its cases as literal strings and has no number to
        // offset, so an offset there would be invalid ICU rather than a no-op.
        const offset =
          message.offset === undefined || message.kind === 'select'
            ? ''
            : ` offset:${message.offset}`;
        return `{${String(message.identifier)}, ${format},${offset}\n${branches}}`;
      }

      case message instanceof CompositeMessage:
        return Object.entries(message.children)
          .map(([, m]) => internalConvertMessageToIcu(m))
          .join('');

      default:
        throw new Error('Unknown message type', { cause: message });
    }
  }

  // Not trimmed. A message carries the text it was written with, and a space
  // at either end is as deliberate as one in the middle — `{' '}` is how a JSX
  // message asks for one, and every character of a template literal is already
  // exactly what it says. Trimming here would quietly overrule both.
  return internalConvertMessageToIcu(message);
}
