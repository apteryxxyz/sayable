/**
 * KEEP IN SYNC:
 * - `packages/plugin-tsc/src/message-types.ts`
 * - `packages/plugin-swc/src/message_types.rs`
 */
use swc_core::ecma::ast::Expr;

#[derive(Debug, Clone)]
///
/// Represents a static literal value in a message.
///
pub struct LiteralMessage {
  pub text: String,
}
impl LiteralMessage {
  pub fn new(text: impl Into<String>) -> Self {
    LiteralMessage { text: text.into() }
  }
}

#[derive(Debug, Clone)]
///
/// Represents a placeholder/variable within a message.
///
/// # Examples
/// ```ts
/// '{name}'
/// ```
///
pub struct ArgumentMessage {
  pub identifier: String,
  /// The expression that "gets" the value for this argument.
  pub expression: Box<Expr>,
}
impl ArgumentMessage {
  pub fn new(identifier: impl Into<String>, expression: Box<Expr>) -> Self {
    ArgumentMessage {
      identifier: identifier.into(),
      expression,
    }
  }
}

#[derive(Debug, Clone)]
///
/// Represents a part of the message wrapped in a specific XML-like tag.
/// Children are indexed by their order.
///
/// # Examples
///
/// ```ts
/// '<0>Hello, world!</0>'
/// ```
///
pub struct ElementMessage {
  pub identifier: String,
  /// The expression that "gets" the component for this element.
  pub expression: Box<Expr>,
  pub children: Vec<Message>,
}
impl ElementMessage {
  pub fn new(identifier: impl Into<String>, expression: Box<Expr>, children: Vec<Message>) -> Self {
    ElementMessage {
      identifier: identifier.into(),
      expression,
      children,
    }
  }
}

#[derive(Debug, Clone)]
///
/// Represents a number of messages that chooses among multiple options based on a variable.
///
/// # Examples
///
/// ```ts
/// '{gender, select, male {He} female {She} other {They}}'
/// '{count, plural, one {1 item} other {# items}}'
/// '{rank, selectordinal, =1 {1st} =2 {2nd} =3 {3rd} other {#th}}'
/// ```
///
pub struct ChoiceMessage {
  pub kind: String,
  pub identifier: String,
  /// The expression that "gets" the value for this ordinal.
  pub expression: Box<Expr>,
  pub branches: Vec<(String, Message)>,
}
impl ChoiceMessage {
  pub fn new(
    kind: impl Into<String>,
    identifier: impl Into<String>,
    expression: Box<Expr>,
    branches: Vec<(String, Message)>,
  ) -> Self {
    ChoiceMessage {
      kind: kind.into(),
      identifier: identifier.into(),
      expression,
      branches,
    }
  }
}

#[derive(Debug, Clone)]
///
/// Represents a sequence of messages, such as a template literal or concatenated parts.
/// Children are indexed by their order.
///
pub struct CompositeMessage {
  ///
  /// The expression that accesses the `say` method on the object.
  /// Usually `say`, but can be any object with a `say` method (`object.say`).
  ///
  pub accessor: Box<Expr>,
  pub children: Vec<Message>,
  pub context: Option<String>,
  // Comments and references are only ever used by the cli compiler, which the swc plugin does not support
  // pub comments: None,
  // pub references: None,
}
impl CompositeMessage {
  pub fn new(accessor: Box<Expr>, children: Vec<Message>, context: Option<String>) -> Self {
    CompositeMessage {
      accessor,
      children,
      context,
    }
  }
}

#[derive(Debug, Clone)]
pub enum Message {
  Literal(LiteralMessage),
  Argument(ArgumentMessage),
  Element(ElementMessage),
  Choice(ChoiceMessage),
  Composite(CompositeMessage),
}
