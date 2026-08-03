import {
  ArgumentMessage,
  ChoiceMessage,
  CompositeMessage,
  ElementMessage,
  type Message,
} from './types.js';

export const AUTO_INCREMENT_IDENTIFIER = Symbol('auto-increment');

/**
 * An ICU case, either an exact value or a key. ICU reserves its own pattern
 * syntax, so a key carries no punctuation and no whitespace.
 */
const BRANCH_PATTERN = /^(?:=\d+|[^\p{Pattern_Syntax}\p{Pattern_White_Space}]+)$/u;

/**
 * The ICU case a branch is written as. A number names an exact value rather
 * than a key, and only `plural` and `ordinal` are allowed to select on one.
 */
export function getBranchCase(identifier: string | typeof AUTO_INCREMENT_IDENTIFIER) {
  const key = String(identifier);
  return Number.isNaN(+key) ? key : `=${+key}`;
}

/**
 * Reject a branch key ICU cannot express, while the key is still attached to a
 * file and a line.
 *
 * A hyphenated string union is ordinary application code and typechecks,
 * builds, and extracts to a catalogue entry that looks perfectly normal — the
 * only sign of trouble is a parse error at format time, in a message whose
 * source is long gone.
 */
export function validateBranchIdentifier(
  kind: string,
  identifier: string | typeof AUTO_INCREMENT_IDENTIFIER,
) {
  // A branch still awaiting a sequence number is numbered, and a number is
  // always a well-formed case.
  if (typeof identifier !== 'string') return;

  const branch = getBranchCase(identifier);

  if (!BRANCH_PATTERN.test(branch)) {
    const suggestion = suggestBranchIdentifier(identifier);
    throw new Error(
      `Invalid ${kind} branch key '${identifier}', an ICU key cannot contain punctuation or whitespace` +
        (suggestion ? `, try '${suggestion}'` : ''),
    );
  }

  if (kind === 'select' && branch.startsWith('='))
    throw new Error(
      `Invalid select branch key '${identifier}', a number selects an exact value, which only 'plural' and 'ordinal' accept`,
    );
}

/**
 * The nearest identifier-safe form of a key, so the error names the fix as well
 * as the problem. The constraint comes from ICU rather than from anything the
 * author wrote, and camel case is how the rest of the codebase already spells a
 * name of more than one word.
 */
function suggestBranchIdentifier(identifier: string) {
  const suggestion = identifier
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word, index) => (index === 0 ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join('');

  if (!BRANCH_PATTERN.test(suggestion) || !Number.isNaN(+suggestion)) return undefined;
  return suggestion;
}

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
