/**
 * KEEP IN SYNC:
 * - `packages/plugin/src/message-types.ts`
 * - `packages/swc-plugin/src/message_types.rs`
 */
use std::collections::BTreeMap;
use swc_core::ecma::ast::Expr;

#[derive(Debug, Clone)]
///
/// Represents a static literal value in a message.
///
pub struct LiteralMessage {
  pub text: String,
}

#[derive(Debug, Clone)]
///
/// Represents a placeholder/variable within a message (e.g., `{name}`).
///
pub struct ArgumentMessage {
  pub identifier: String,
  ///
  /// The expression that "gets" the value for this argument.
  ///
  pub expression: Box<Expr>,
}

#[derive(Debug, Clone)]
///
/// Represents a number of messages that chooses among multiple options based on a variable.
/// #### Example
/// - `{gender, select, male {He} female {She} other {They}}`
/// - `{count, plural, one {1 item} other {# items}}`
/// - `{rank, selectordinal, =1 {1st} =2 {2nd} =3 {3rd} other {#th}}`
///
pub struct ChoiceMessage {
  pub kind: String,
  pub identifier: String,
  ///
  /// The expression that "gets" the value for this ordinal.
  ///
  pub expression: Box<Expr>,
  pub children: BTreeMap<String, Message>,
}

#[derive(Debug, Clone)]
///
/// Represents a sequence of messages, such as a template literal or concatenated parts.
/// Children are indexed by their order.
///
pub struct CompositeMessage {
  ///
  /// The expression that accesses the `say` method on the object.
  /// #### Example
  /// Usually `say`, but can be any object with a `say` method (`object.say`).
  ///
  pub expression: Box<Expr>,
  pub children: BTreeMap<String, Message>,
  // Comments and location are only ever used by the cli compiler, which the swc plugin does not support
  // pub comment: None,
  // pub location: None,
}

#[derive(Debug, Clone)]
pub enum Message {
  Literal(LiteralMessage),
  Argument(ArgumentMessage),
  Choice(ChoiceMessage),
  Composite(CompositeMessage),
}
