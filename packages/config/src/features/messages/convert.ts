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
  function internalConvertMessageToIcu(message: Message): string {
    switch (true) {
      case message instanceof LiteralMessage:
        return String(message.text);

      case message instanceof ArgumentMessage:
        return `{${String(message.identifier)}}`;

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
            identifier: getBranchCase(identifier),
            value: internalConvertMessageToIcu(value),
          }))
          .map(({ identifier, value }) => `  ${identifier} {${value}}\n`)
          .join('');
        const format = message.kind === 'ordinal' ? 'selectordinal' : message.kind;
        return `{${String(message.identifier)}, ${format},\n${branches}}`;
      }

      case message instanceof CompositeMessage:
        return Object.entries(message.children)
          .map(([, m]) => internalConvertMessageToIcu(m))
          .join('');

      default:
        throw new Error('Unknown message type', { cause: message });
    }
  }

  return internalConvertMessageToIcu(message).trim();
}
