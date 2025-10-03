/**
 * KEEP IN SYNC:
 * - 'packages/plugin-tsc/src/message-types.ts'
 * - 'packages/plugin-swc/src/message_types.rs'
 */

import type t from 'typescript';

/**
 * Represents a static literal value in a message.
 */
export interface LiteralMessage {
  type: 'literal';
  text: string;
}

/**
 * Represents a placeholder/variable within a message.
 * @example '{name}'
 */
export interface ArgumentMessage {
  type: 'argument';
  identifier: string;
  /**
   * The expression that "gets" the value for this argument.
   */
  expression: t.Expression;
}

/**
 * Represents a part of the message wrapped in a specific XML-like tag.
 * Children are indexed by their order.
 * @example '<0>Hello, world!</0>'
 */
export interface ElementMessage {
  type: 'element';
  identifier: string;
  /** The expression that "gets" the component for this element. */
  expression: t.Expression;
  children: Record<string /*number*/, Message>;
}

/**
 * Represents a number of messages that chooses among multiple options based on a variable.
 * @example '{gender, select, male {He} female {She} other {They}}'
 * @example '{count, plural, one {1 item} other {# items}}'
 * @example '{rank, selectordinal, =1 {1st} =2 {2nd} =3 {3rd} other {#th}}'
 */
export interface ChoiceMessage {
  type: 'choice';
  kind: 'select' | 'plural' | 'ordinal';
  identifier: string;
  /** The expression that "gets" the value for this choice. */
  expression: t.Expression;
  children: Record<string, Message>;
}

/**
 * Represents a sequence of messages, such as a template literal or concatenated parts.
 * Children are indexed by their order.
 */
export interface CompositeMessage {
  type: 'composite';
  comments: string[] | undefined;
  references: `${string}:${number}`[] | undefined;
  context: string | undefined;
  /**
   * The expression that accesses the `say` method on the object.
   * @remark usually `say` identifier, but can be any object with a `say` method (`object.say`).
   */
  accessor: t.Expression;
  children: Record<string /*number*/, Message>;
}

export type Message =
  | LiteralMessage
  | ArgumentMessage
  | ElementMessage
  | ChoiceMessage
  | CompositeMessage;
