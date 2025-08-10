/**
 * KEEP IN SYNC:
 * - `packages/plugin/src/ast-generator.ts`
 * - `packages/swc-plugin/src/ast_generator.rs`
 */
use crate::{
  generate_hash::generate_hash,
  icu_generator::generate_icu_message_format,
  message_types::{CompositeMessage, Message},
};

use std::collections::BTreeMap;
use swc_core::{
  common::{SyntaxContext, DUMMY_SP},
  ecma::ast as t,
};

///
/// Generates the `say` expression for a message.
///
pub fn generate_say_expression(message: &CompositeMessage) -> t::Expr {
  let mut entries = BTreeMap::new();

  entries.insert(
    "id".to_string(),
    Box::new(t::Expr::Lit(t::Lit::Str(t::Str {
      span: DUMMY_SP,
      value: generate_hash(generate_icu_message_format(&Message::Composite(
        message.clone(),
      )))
      .into(),
      raw: None,
    }))),
  );
  for (k, v) in generate_child_expressions(&message.children) {
    entries.insert(k, v);
  }

  let properties = entries
    .into_iter()
    .map(|(k, v)| {
      t::PropOrSpread::Prop(Box::new(t::Prop::KeyValue(t::KeyValueProp {
        key: t::PropName::Ident(t::IdentName::new(k.into(), DUMMY_SP)),
        value: v,
      })))
    })
    .collect::<Vec<_>>();

  t::Expr::Call(t::CallExpr {
    span: DUMMY_SP,
    ctxt: SyntaxContext::empty(),
    callee: t::Callee::Expr(Box::new(t::Expr::Member(t::MemberExpr {
      span: DUMMY_SP,
      obj: Box::new(*message.expression.clone()),
      prop: t::MemberProp::Ident(t::IdentName::new("say".into(), DUMMY_SP)),
    }))),
    args: vec![t::ExprOrSpread {
      spread: None,
      expr: Box::new(t::Expr::Object(t::ObjectLit {
        span: DUMMY_SP,
        props: properties,
      })),
    }],
    type_args: None,
  })
}

///
/// Generates the child expressions for a message.
///
fn generate_child_expressions(children: &BTreeMap<String, Message>) -> Vec<(String, Box<t::Expr>)> {
  let mut results = Vec::new();

  for message in children.values() {
    match message {
      Message::Argument(message) => {
        results.push((message.identifier.clone(), message.expression.clone()));
      }

      Message::Choice(message) => {
        results.push((message.identifier.clone(), message.expression.clone()));
        results.extend(generate_child_expressions(&message.children));
      }

      _ => {}
    }
  }

  results
}
