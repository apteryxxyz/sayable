import {
  ArgumentMessage,
  ChoiceMessage,
  CompositeMessage,
  ElementMessage,
  type Message,
} from './types.js';

export const AUTO_INCREMENT_IDENTIFIER = Symbol('auto-increment');

/**
 * Decides whether two placeholders sharing a name are the same placeholder, and
 * so may share it. Only the syntax that produced them can answer that, so the
 * caller supplies the comparison; by default nothing is interchangeable.
 */
export type PlaceholderEquivalence = (a: any, b: any) => boolean;

export function assignSequenceIdentifiers(
  message: Message,
  sequence = { current: 0 },
  equivalent: PlaceholderEquivalence = () => false,
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
 * A name is claimed by what produced it, not by the name alone. Two that differ
 * each compile to their own prop, and a translator moving them around a sentence
 * has to be able to tell them apart, so they are a build error. Repeats are fine
 * when nothing distinguishes them: the same variable interpolated twice is one
 * value, and two identical elements are one tag.
 */
function collectAssignedIdentifiers(message: Message, equivalent: PlaceholderEquivalence) {
  const tags = new Map<string, unknown>();
  const values = new Map<string, unknown>();

  function claim(
    claimed: Map<string, unknown>,
    identifier: string,
    expression: unknown,
    conflict: string,
  ) {
    if (claimed.has(identifier) && !equivalent(claimed.get(identifier), expression))
      throw new Error(conflict);
    claimed.set(identifier, expression);
  }

  function walk(message: Message) {
    if (message instanceof ElementMessage && typeof message.identifier === 'string')
      claim(
        tags,
        message.identifier,
        message.expression,
        `Duplicate element tag '${message.identifier}', give each element in a message its own tag unless they are identical`,
      );
    if (
      (message instanceof ArgumentMessage || message instanceof ChoiceMessage) &&
      typeof message.identifier === 'string'
    )
      claim(
        values,
        message.identifier,
        message.expression,
        `Duplicate placeholder name '${message.identifier}', give each value in a message its own name unless they are identical`,
      );
    if (message instanceof CompositeMessage || message instanceof ElementMessage)
      for (const child of message.children) walk(child);
    if (message instanceof ChoiceMessage) for (const branch of message.branches) walk(branch.value);
  }

  walk(message);

  for (const tag of tags.keys())
    if (values.has(tag))
      throw new Error(`Element tag '${tag}' collides with an argument of the same name`);

  return new Set([...tags.keys(), ...values.keys()]);
}
