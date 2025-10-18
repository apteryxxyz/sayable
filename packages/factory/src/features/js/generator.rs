use swc_core::common::DUMMY_SP;
use swc_core::ecma::ast::*;

use crate::core::messages::convert::convert_message_to_icu;
use crate::core::messages::hash::generate_hash;
use crate::core::messages::{CompositeMessage, Message};

/// Generates a [`CallExpr`] representing a `say(...)` function call from a [`CompositeMessage`].
///
/// The generated call looks like:
/// ```js
/// say.call({
///   id: "some_hash",
///   name: ...,
///   count: ...,
///   ...
/// });
/// ```
///
/// - The `id` is a hash of the ICU message and optional context.
/// - All argument, element, and choice messages are included as properties.
/// - Nested messages are recursively flattened into properties.
pub fn generate_say_call_expression(message: &CompositeMessage) -> CallExpr {
  let mut children: Vec<(String, Box<Expr>)> = Vec::new();

  if let Some(id) = &message.descriptor.id {
    children.push(("id".into(), Expr::Lit(id.clone().into()).into()));
  } else {
    let icu = convert_message_to_icu(&message.clone().into());
    let hash = generate_hash(icu, message.descriptor.context.clone());
    children.push(("id".into(), Expr::Lit(hash.into()).into()));
  }
  children.extend(generate_child_expressions(&message.children));

  let properties = children
    .into_iter()
    .map(|(name, expression)| {
      PropOrSpread::Prop(
        Prop::KeyValue(KeyValueProp {
          key: PropName::Ident(name.into()),
          value: expression,
        })
        .into(),
      )
    })
    .collect::<Vec<_>>();

  CallExpr {
    callee: Callee::Expr(
      Expr::Member(MemberExpr {
        obj: message.accessor.clone(),
        prop: MemberProp::Ident("call".into()),
        ..Default::default()
      })
      .into(),
    ),
    args: vec![ExprOrSpread {
      spread: None,
      expr: Expr::Object(ObjectLit {
        span: DUMMY_SP,
        props: properties,
      })
      .into(),
    }],
    ..Default::default()
  }
}

/// Recursively generates a flat list of `(identifier, expression)` pairs for all children
/// of a [`Message`] tree. This is used to populate the object passed to `say.call(...)`.
///
/// Handles all message types:
/// - [`ArgumentMessage`] (simple identifiers)
/// - [`ElementMessage`] (with nested children)
/// - [`ChoiceMessage`] (with branches and nested content)
/// - [`CompositeMessage`] (nested messages)
pub fn generate_child_expressions(messages: &[Message]) -> Vec<(String, Box<Expr>)> {
  let mut results = Vec::new();

  for message in messages.iter() {
    match (
      &message.literal,
      &message.argument,
      &message.element,
      &message.choice,
      &message.composite,
    ) {
      (None, Some(message), None, None, None) => {
        results.push((message.identifier.clone(), message.expression.clone()));
      }

      (None, None, Some(message), None, None) => {
        results.push((message.identifier.clone(), message.expression.clone()));
        results.extend(generate_child_expressions(&message.children));
      }

      (None, None, None, Some(message), None) => {
        results.push((message.identifier.clone(), message.expression.clone()));
        let branches = message
          .branches
          .iter()
          .map(|b| b.value.clone())
          .collect::<Vec<_>>();
        results.extend(generate_child_expressions(&branches));
      }

      (None, None, None, None, Some(message)) => {
        results.extend(generate_child_expressions(&message.children));
      }

      _ => continue,
    }
  }

  results
}
