/**
 * KEEP IN SYNC:
 * - `packages/message-utils/src/message-types.ts`
 * - `packages/plugin/src/message-types.ts`
 * - `packages/swc-plugin/src/message_types.rs`
 */

/**
 * Represents a static literal value in a message.
 */
export interface LiteralMessage {
  type: 'literal';
  text: string;
}

/**
 * Represents a placeholder/variable within a message (e.g., `{name}`).
 */
export interface ArgumentMessage {
  type: 'argument';
  identifier: string;
}

/**
 * Represents a part of the message wrapped in a specific HTML-like tag.
 * Children are indexed by their order.
 * @example `<0>Hello, world!</0>`
 */
export interface ElementMessage {
  type: 'element';
  identifier: string;
  children: Record<string /*number*/, Message>;
}

/**
 * Represents a number of messages that chooses among multiple options based on a variable.
 * @example `{gender, select, male {He} female {She} other {They}}`
 * @example `{count, plural, one {1 item} other {# items}}`
 * @example `{rank, selectordinal, =1 {1st} =2 {2nd} =3 {3rd} other {#th}}`
 */
export interface ChoiceMessage {
  type: 'choice';
  kind: 'select' | 'plural' | 'ordinal';
  identifier: string;
  children: Record<string, Message>;
}

/**
 * Represents a sequence of messages, such as a template literal or concatenated parts.
 * Children are indexed by their order.
 */
export interface CompositeMessage {
  type: 'composite';
  children: Record<string /*number*/, Message>;
  comments: string[] | undefined;
  references: `${string}:${number}`[] | undefined;
  context: string | undefined;
}

export type Message =
  | LiteralMessage
  | ArgumentMessage
  | ElementMessage
  | ChoiceMessage
  | CompositeMessage;
