import { escapeIcuLiteral } from './escape.js';
import { getBranchCase } from './identifier.js';
import {
  ArgumentMessage,
  ChoiceMessage,
  CompositeMessage,
  ElementMessage,
  LiteralMessage,
  type Message,
} from './types.js';

export function convertMessageToIcu(message: Message) {
  /**
   * Convert a run of children, walking it backwards so each one is converted
   * knowing the character it will run into. A child that converts to nothing
   * passes its own follower along, since it puts nothing between them.
   */
  function convertChildren(messages: Message[], following: string) {
    const parts: string[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const part = internalConvertMessageToIcu(messages[i]!, following);
      parts.unshift(part);
      following = part[0] ?? following;
    }

    return parts.join('');
  }

  function internalConvertMessageToIcu(message: Message, following: string): string {
    switch (true) {
      case message instanceof LiteralMessage:
        return escapeIcuLiteral(String(message.text), following);

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
        // The closing tag follows the children, and `<` is not ICU syntax.
        const children = convertChildren(message.children, '<');
        return `<${String(message.identifier)}>${children}</${String(message.identifier)}>`;
      }

      case message instanceof ChoiceMessage: {
        const branches = message.branches
          .map(({ identifier, value }) => ({
            identifier: getBranchCase(message.kind, identifier),
            // A branch is closed by a brace, which a trailing apostrophe would
            // otherwise quote — taking the end of the branch with it.
            value: internalConvertMessageToIcu(value, '}'),
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
        return convertChildren(message.children, following);

      default:
        throw new Error('Unknown message type', { cause: message });
    }
  }

  // Not trimmed. A message carries the text it was written with, and a space
  // at either end is as deliberate as one in the middle — `{' '}` is how a JSX
  // message asks for one, and every character of a template literal is already
  // exactly what it says. Trimming here would quietly overrule both.
  // Nothing follows a whole message, so its last character runs into the end
  // of the string, where no quoting can start.
  return internalConvertMessageToIcu(message, '');
}
