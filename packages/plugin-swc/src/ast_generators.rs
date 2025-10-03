/**
 * KEEP IN SYNC:
 * - `packages/plugin-tsc/src/ast-generators.ts`
 * - `packages/plugin-swc/src/ast_generators.rs`
 */
use swc_core::{
  common::{util::take::Take, SyntaxContext, DUMMY_SP},
  ecma::ast as t,
};

use crate::{
  generate_hash::generate_hash,
  generate_icu_message_format::generate_icu_message_format,
  message_types::{CompositeMessage, Message},
};

///
/// Generates an expression for a runtime `say({ ... })` call.
/// Includes all interpolated children and a hashed message ID.
///
/// # Arguments
///
/// * `message` — The composite message to turn into a call expression
///
/// # Returns
///
/// `Expr::Call(CallExpr)` node
///
pub fn generate_say_expression(message: &CompositeMessage) -> t::Expr {
  let mut children = Vec::new();

  children.push((
    "id".to_string(),
    Box::new(t::Expr::Lit(t::Lit::Str(t::Str {
      span: DUMMY_SP,
      value: generate_hash(
        &generate_icu_message_format(&Message::Composite(message.clone())),
        message.context.as_deref(),
      )
      .into(),
      raw: None,
    }))),
  ));
  children.extend(generate_child_expressions(&message.children));

  let properties = children
    .into_iter()
    .map(|(name, expression)| {
      t::PropOrSpread::Prop(Box::new(t::Prop::KeyValue(t::KeyValueProp {
        key: t::PropName::Ident(t::IdentName::new(name.into(), DUMMY_SP)),
        value: expression,
      })))
    })
    .collect::<Vec<_>>();

  t::Expr::Call(t::CallExpr {
    span: DUMMY_SP,
    ctxt: SyntaxContext::empty(),
    callee: t::Callee::Expr(Box::new(t::Expr::Member(t::MemberExpr {
      span: DUMMY_SP,
      obj: message.accessor.clone(),
      prop: t::MemberProp::Ident(t::IdentName::new("call".into(), DUMMY_SP)),
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
/// Generates a JSX self-closing element like `<Say.Plural />` with props.
/// Converts message children to JSX attributes, includes hashed ID.
///
/// # Arguments
///
/// * `message` — The composite message to convert into JSX
///
/// # Returns
///
/// `JSXElement` node
///
pub fn generate_jsx_say_expression(message: &CompositeMessage) -> t::JSXElement {
  let mut children = Vec::new();

  children.push((
    "id".to_string(),
    Box::new(t::Expr::Lit(t::Lit::Str(t::Str {
      span: DUMMY_SP,
      value: generate_hash(
        &generate_icu_message_format(&Message::Composite(message.clone())),
        message.context.as_deref(),
      )
      .into(),
      raw: None,
    }))),
  ));
  children.extend(generate_child_expressions(&message.children));

  let properties = children
    .into_iter()
    .map(|(name, expression)| {
      let mut name: String = name;

      // If name is numeric, prefix with `_` since JSX props can't start with numbers
      if name.parse::<f64>().is_ok() {
        name = format!("_{name}");
      }

      // Strip children from any nested JSX elements to avoid redundant output
      // Related to element message type
      let mut expression = *expression;
      if let t::Expr::JSXElement(el) = expression {
        expression = t::Expr::JSXElement(Box::new(remove_react_element_children(&el)));
      }

      t::JSXAttrOrSpread::JSXAttr(t::JSXAttr {
        span: DUMMY_SP,
        name: t::JSXAttrName::Ident(t::IdentName::new(name.into(), DUMMY_SP)),
        value: Some(t::JSXAttrValue::JSXExprContainer(t::JSXExprContainer {
          span: DUMMY_SP,
          expr: t::JSXExpr::Expr(Box::new(expression)),
        })),
      })
    })
    .collect::<Vec<_>>();

  t::JSXElement {
    span: DUMMY_SP,
    opening: t::JSXOpeningElement {
      name: match message.accessor.as_ref() {
        t::Expr::Ident(ident) => t::JSXElementName::Ident(ident.clone()),
        _ => t::JSXElementName::dummy(),
      },
      span: DUMMY_SP,
      attrs: properties,
      self_closing: true,
      type_args: None,
    },
    children: vec![],
    closing: None,
  }
}

///
/// Strips children from a JSX element.
/// Used to prevent double-nesting when generating from `element` type messages.
///
/// # Arguments
///
/// * `element` — JSX element to strip children from
///
/// # Returns
///
/// JSX element without children
///
fn remove_react_element_children(element: &t::JSXElement) -> t::JSXElement {
  t::JSXElement {
    span: DUMMY_SP,
    opening: element.opening.clone(),
    children: vec![],
    closing: element.closing.clone(),
  }
}

///
/// Get list of key-value pairs of expressions to be used in output AST.
///
/// Handles nested message types like:
/// - arguments: basic identifiers or expressions
/// - elements: embedded JSX fragments
/// - choices: plural/select/ordinal forms
/// - composites: nested structures with children
///
/// # Arguments
///
/// * `children` — A record of message parts (arguments, choices, etc.)
///
/// # Returns
///
/// List of key-value pairs of expressions
///
fn generate_child_expressions(children: &[Message]) -> Vec<(String, Box<t::Expr>)> {
  let mut results = Vec::new();

  for message in children.iter() {
    match message {
      Message::Argument(message) => {
        results.push((message.identifier.clone(), message.expression.clone()));
      }

      Message::Element(message) => {
        results.push((message.identifier.clone(), message.expression.clone()));
        results.extend(generate_child_expressions(&message.children));
      }

      Message::Choice(message) => {
        results.push((message.identifier.clone(), message.expression.clone()));
        let branches = &message
          .branches
          .iter()
          .map(|(_, m)| m.clone())
          .collect::<Vec<_>>();
        results.extend(generate_child_expressions(&branches));
      }

      Message::Composite(message) => {
        results.extend(generate_child_expressions(&message.children));
      }

      _ => continue,
    }
  }

  results
}
