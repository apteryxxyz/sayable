/**
 * KEEP IN SYNC:
 * - `packages/plugin/src/message-types.ts`
 * - `packages/swc-plugin/src/message_types.rs`
 */

import type * as s from '@sayable/message-utils';
import type t from 'typescript';

/**
 * Represents a static literal value in a message.
 */
export interface LiteralMessage extends s.LiteralMessage {}

/**
 * Represents a placeholder/variable within a message (e.g., `{name}`).
 */
export interface ArgumentMessage extends s.ArgumentMessage {
  /**
   * The expression that "gets" the value for this select.
   */
  expression: t.Expression;
}

/**
 * Represents a part of the message wrapped in a specific XML-like tag.
 * Children are indexed by their order.
 * @example `<0>Hello, world!</0>`
 */
export interface ElementMessage extends s.ElementMessage {
  expression: t.Expression;
  children: Record<string /*number*/, Message>;
}

/**
 * Represents a number of messages that chooses among multiple options based on a variable.
 * @example `{gender, select, male {He} female {She} other {They}}`
 * @example `{count, plural, one {1 item} other {# items}}`
 * @example `{rank, selectordinal, =1 {1st} =2 {2nd} =3 {3rd} other {#th}}`
 */
export interface ChoiceMessage extends s.ChoiceMessage {
  /**
   * The expression that "gets" the value for this select.
   */
  expression: t.Expression;
  children: Record<string, Message>;
}

/**
 * Represents a sequence of messages, such as a template literal or concatenated parts.
 * Children are indexed by their order.
 */
export interface CompositeMessage extends s.CompositeMessage {
  /**
   * The expression that accesses the `say` method on the object.
   * @example usually `say`, but can be any object with a `say` method (`object.say`).
   */
  expression: t.Expression;
  children: Record<string /*number*/, Message>;
}

export type Message =
  | LiteralMessage
  | ArgumentMessage
  | ElementMessage
  | ChoiceMessage
  | CompositeMessage;
