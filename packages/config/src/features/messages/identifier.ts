import {
  ArgumentMessage,
  ChoiceMessage,
  CompositeMessage,
  ElementMessage,
  type Message,
} from './types.js';

export const AUTO_INCREMENT_IDENTIFIER = Symbol('auto-increment');

export function assignSequenceIdentifiers(message: Message, sequence = { current: 0 }) {
  const reserved = collectAssignedIdentifiers(message);

  function next() {
    let identifier = `${sequence.current++}`;
    while (reserved.has(identifier)) identifier = `${sequence.current++}`;
    return identifier;
  }

  function walk(message: Message) {
    if (
      message instanceof ArgumentMessage ||
      message instanceof ElementMessage ||
      message instanceof ChoiceMessage
    )
      if (message.identifier === AUTO_INCREMENT_IDENTIFIER) message.identifier = next();
    if (message instanceof CompositeMessage || message instanceof ElementMessage)
      for (const child of message.children) walk(child);
    if (message instanceof ChoiceMessage)
      for (const branch of message.branches) {
        if (branch.identifier === AUTO_INCREMENT_IDENTIFIER) branch.identifier = next();
        walk(branch.value);
      }
  }

  walk(message);
}

/**
 * Collect the identifiers already assigned before this pass runs, so generated
 * sequence numbers never shadow an explicit one (e.g. an element tagged `0`).
 *
 * Every element in a message needs its own tag: they each compile to their own
 * prop, and a translator has to be able to tell them apart. Two arguments may
 * legitimately share an identifier, though — the same variable interpolated
 * twice is one value — so only elements are checked for repeats.
 */
function collectAssignedIdentifiers(message: Message) {
  const tags = new Set<string>();
  const values = new Set<string>();

  function walk(message: Message) {
    if (message instanceof ElementMessage && typeof message.identifier === 'string') {
      if (tags.has(message.identifier))
        throw new Error(
          `Duplicate element tag '${message.identifier}', give each element in a message its own tag`,
        );
      tags.add(message.identifier);
    }
    if (
      (message instanceof ArgumentMessage || message instanceof ChoiceMessage) &&
      typeof message.identifier === 'string'
    )
      values.add(message.identifier);
    if (message instanceof CompositeMessage || message instanceof ElementMessage)
      for (const child of message.children) walk(child);
    if (message instanceof ChoiceMessage) for (const branch of message.branches) walk(branch.value);
  }

  walk(message);

  for (const tag of tags)
    if (values.has(tag))
      throw new Error(`Element tag '${tag}' collides with an argument of the same name`);

  return new Set([...tags, ...values]);
}
