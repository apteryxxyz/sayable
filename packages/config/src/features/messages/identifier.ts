import {
  ArgumentMessage,
  ChoiceMessage,
  CompositeMessage,
  ElementMessage,
  type Message,
} from './types.js';

export const AUTO_INCREMENT_IDENTIFIER = Symbol('auto-increment');

/**
 * Decides whether two elements sharing a tag are the same element, and so may
 * share it. Only the syntax that produced them can answer that, so the caller
 * supplies the comparison; by default no two elements are interchangeable.
 */
export type ElementEquivalence = (a: any, b: any) => boolean;

export function assignSequenceIdentifiers(
  message: Message,
  sequence = { current: 0 },
  equivalent: ElementEquivalence = () => false,
) {
  const reserved = collectAssignedIdentifiers(message, equivalent);

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
 * Elements that differ need their own tag: they each compile to their own prop,
 * and a translator has to be able to tell them apart. Repeats are fine when
 * nothing distinguishes them — two identical elements are one prop, the same
 * way the same variable interpolated twice is one value — so arguments are
 * never checked and elements only when they are not equivalent.
 */
function collectAssignedIdentifiers(message: Message, equivalent: ElementEquivalence) {
  const tags = new Map<string, ElementMessage>();
  const values = new Set<string>();

  function walk(message: Message) {
    if (message instanceof ElementMessage && typeof message.identifier === 'string') {
      const previous = tags.get(message.identifier);
      if (previous && !equivalent(previous.expression, message.expression))
        throw new Error(
          `Duplicate element tag '${message.identifier}', give each element in a message its own tag unless they are identical`,
        );
      tags.set(message.identifier, message);
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

  for (const tag of tags.keys())
    if (values.has(tag))
      throw new Error(`Element tag '${tag}' collides with an argument of the same name`);

  return new Set([...tags.keys(), ...values]);
}
