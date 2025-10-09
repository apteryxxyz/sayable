use swc_core::common::DUMMY_SP;
use swc_core::ecma::ast::*;

use crate::core::messages::convert::convert_message_to_icu;
use crate::core::messages::hash::generate_hash;
use crate::core::messages::CompositeMessage;
use crate::features::js::generator::generate_child_expressions;

/// Generates a [`JSXElement`] representing a `<Say>` JSX element from a [`CompositeMessage`].
///
/// The generated element looks like:
/// ```jsx
/// <Say
///   id="some_hash"
///   name="..."
///   count="..."
/// />
///
/// - The `id` is a hash of the ICU message and optional context.
/// - All argument, element, and choice messages are included as properties.
/// - Nested messages are recursively flattened into properties.
pub fn generate_say_jsx_element(message: &CompositeMessage) -> JSXElement {
  let mut children = Vec::new();
  let icu = convert_message_to_icu(&message.clone().into());
  let hash = generate_hash(icu, message.context.clone());
  children.push(("id".into(), Expr::Lit(hash.into()).into()));
  children.extend(generate_child_expressions(&message.children));

  let properties = children
    .into_iter()
    .map(|(mut name, expression)| {
      if name.parse::<f64>().is_ok() {
        name = format!("_{name}");
      }

      JSXAttrOrSpread::JSXAttr(JSXAttr {
        span: DUMMY_SP,
        name: JSXAttrName::Ident(name.into()),
        value: Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
          span: DUMMY_SP,
          expr: JSXExpr::Expr(expression),
        })),
      })
    })
    .collect::<Vec<_>>();

  JSXElement {
    span: DUMMY_SP,
    opening: JSXOpeningElement {
      name: match message.accessor.as_ref() {
        Expr::Ident(ident) => JSXElementName::Ident(ident.clone()),
        _ => unreachable!(),
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
