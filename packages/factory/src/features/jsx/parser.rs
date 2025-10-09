use std::cell::RefCell;
use std::rc::Rc;

use regex::Regex;
use swc_core::common::{Spanned, DUMMY_SP};
use swc_core::ecma::ast::*;

use crate::core::context::Context;
use crate::core::messages::{
  ArgumentMessage, ChoiceMessage, ChoiceMessageBranch, CompositeMessage, ElementMessage,
  LiteralMessage, Message,
};
use crate::features::js::parser::{
  get_position_comments, get_position_reference, use_expression_key,
};

//

fn parse_jsx_element(
  ctx: &Rc<RefCell<Context>>,
  element: &JSXElement,
  fallback: bool,
) -> Option<Message> {
  let message = match element.opening.self_closing {
    // <Say>...</Say>
    false => parse_jsx_container_element(ctx, element),
    // <Say.Select />
    true => parse_jsx_self_closing_element(ctx, element),
  };

  if let Some(message) = message {
    Some(message.into())
  } else if fallback {
    if element.opening.self_closing {
      // <br/>
      Some(
        ElementMessage::new(
          ctx.borrow_mut().identifier_store.next(),
          vec![],
          Expr::JSXElement(element.clone().into()).into(),
        )
        .into(),
      )
    } else {
      // <span>...</span>

      let fake = create_fake_say_jsx_element(element.children.clone());

      // Preload the identifier to prevent out of order ids if
      // `parseJsxElement` requests ids
      let preloaded_identifier = ctx.borrow_mut().identifier_store.next();

      let message = parse_jsx_element(ctx, &fake, true);
      if let Some(message) = message {
        let identifier = preloaded_identifier;
        Some(
          ElementMessage::new(
            identifier,
            [message].into(),
            Expr::JSXElement(element.clone().into()).into(),
          )
          .into(),
        )
      } else {
        ctx.borrow_mut().identifier_store.back();
        None
      }
    }
  } else {
    None
  }
}

/// Parses a JSX container element like `<Say>...</Say>`.
///
/// Extracts children into a [`CompositeMessage`] made of nested [`Message`]s.
pub fn parse_jsx_container_element(
  ctx: &Rc<RefCell<Context>>,
  element: &JSXElement,
) -> Option<CompositeMessage> {
  let (accessor, _) = process_jsx_element(element)?;

  if !element.opening.self_closing {
    let whitespace_re = Regex::new(r"\s+").unwrap();

    let mut children = Vec::new();
    for child in element.children.iter() {
      let message = match child {
        JSXElementChild::JSXText(text) => {
          let text = whitespace_re
            .replace_all(text.value.as_str(), " ")
            .to_string();
          Some(LiteralMessage::new(text).into())
        }

        JSXElementChild::JSXElement(element) => parse_jsx_element(ctx, element, true),

        JSXElementChild::JSXFragment(fragment) => Some(
          ElementMessage::new(
            ctx.borrow_mut().identifier_store.next(),
            vec![],
            Expr::JSXFragment(fragment.clone()).into(),
          )
          .into(),
        ),

        JSXElementChild::JSXExprContainer(child) => {
          if let JSXExpr::Expr(expr) = &child.expr {
            Some(ArgumentMessage::new(use_expression_key(ctx, expr), expr.clone()).into())
          } else {
            None
          }
        }

        _ => None,
      };

      if let Some(message) = message {
        children.push(message);
      }
    }

    return Some(CompositeMessage::new(
      None,
      get_position_comments(ctx, element.span_lo()),
      get_position_reference(ctx, element.span_lo()).map_or([].into(), |s| [s].into()),
      children,
      accessor.clone(),
    ));
  }

  None
}

/// Parses a self-closing JSX element like `<Say.Select />` into a [`CompositeMessage`] representing a choice.
///
/// Supports: `select`, `plural`, and `ordinal`.
pub fn parse_jsx_self_closing_element(
  ctx: &Rc<RefCell<Context>>,
  element: &JSXElement,
) -> Option<CompositeMessage> {
  let (accessor, kind) = process_jsx_element(element)?;

  if element.opening.self_closing
    && match &kind {
      Some(kind) => kind.eq("select") || kind.eq("ordinal") || kind.eq("plural"),
      None => false,
    }
  {
    let mut branches = Vec::new();
    for attr in &element.opening.attrs {
      let JSXAttrOrSpread::JSXAttr(attr) = attr else {
        continue;
      };

      let mut key = use_attribute_name(&attr.name);
      let value = attr.value.as_ref().unwrap();

      if key.eq("_") {
        continue;
      } else if key.starts_with("_") && key.len() > 1 && key.as_bytes()[1].is_ascii_digit() {
        key = key.replacen("_", "", 1);
      }

      let message: Option<Message> = match &value {
        JSXAttrValue::Lit(Lit::Str(str)) => {
          let text = str.value.to_string();
          Some(LiteralMessage::new(text).into())
        }

        JSXAttrValue::Lit(lit) => {
          let expr = Expr::Lit(lit.clone());
          Some(ArgumentMessage::new(use_expression_key(ctx, &expr), expr.into()).into())
        }

        JSXAttrValue::JSXExprContainer(JSXExprContainer {
          expr: JSXExpr::Expr(expr),
          ..
        }) => match expr.as_ref() {
          Expr::JSXElement(element) => parse_jsx_element(ctx, element, true),

          Expr::JSXFragment(_) => Some(
            ElementMessage::new(
              ctx.borrow_mut().identifier_store.next(),
              vec![],
              expr.clone(),
            )
            .into(),
          ),

          _ => Some(ArgumentMessage::new(use_expression_key(ctx, expr), expr.clone()).into()),
        },

        _ => None,
      };

      if let Some(message) = message {
        branches.push(ChoiceMessageBranch {
          key,
          value: message,
        });
      }
    }

    let initializer = find_attribute_value(&element.opening.attrs, "_")?;
    let value = use_attribute_value(&initializer);

    let choice = ChoiceMessage::new(
      kind.unwrap().to_string(),
      use_expression_key(ctx, &value),
      branches,
      value,
    );

    return Some(CompositeMessage::new(
      None,
      get_position_comments(ctx, element.span_lo()),
      get_position_reference(ctx, element.span_lo()).map_or([].into(), |s| [s].into()),
      vec![choice.into()],
      accessor.clone(),
    ));
  }

  None
}

/// Resolves the expression and optional kind for a `<Say>` or `<Say.Select>` JSX element.
fn process_jsx_element(element: &JSXElement) -> Option<(Box<Expr>, Option<String>)> {
  match &element.opening.name {
    JSXElementName::Ident(ident) if ident.sym.eq("Say") => {
      let expr = Expr::Ident(ident.clone());
      Some((expr.into(), None))
    }

    JSXElementName::JSXMemberExpr(JSXMemberExpr {
      obj: JSXObject::Ident(ident),
      prop,
      ..
    }) if ident.sym.eq("Say") => {
      let expr = Expr::Ident(ident.clone());
      let kind = prop.sym.to_string();
      Some((expr.into(), Some(kind.to_lowercase())))
    }

    _ => None,
  }
}

/// Extracts the name from a JSX attribute.
fn use_attribute_name(name: &JSXAttrName) -> String {
  match name {
    JSXAttrName::Ident(ident) => ident.sym.to_string(),
    JSXAttrName::JSXNamespacedName(ns) => ns.name.sym.to_string(),
  }
}

/// Finds an attribute by name and returns its value.
///
/// If no explicit value is set (e.g., `<input checked />`), returns a boolean `true`.
fn find_attribute_value(attrs: &Vec<JSXAttrOrSpread>, key: &str) -> Option<JSXAttrValue> {
  for attr in attrs {
    if let JSXAttrOrSpread::JSXAttr(attr) = attr {
      match &attr.name {
        JSXAttrName::Ident(ident) => {
          if ident.sym.eq(key) {
            if let Some(value) = &attr.value {
              return Some(value.clone());
            } else {
              return Some(JSXAttrValue::Lit(Lit::Bool(true.into())));
            }
          }
        }
        _ => continue,
      }
    }
  }

  None
}

/// Converts a JSX attribute value into an expression node.
fn use_attribute_value(value: &JSXAttrValue) -> Box<Expr> {
  match value {
    JSXAttrValue::Lit(lit) => Expr::Lit(lit.clone()).into(),
    JSXAttrValue::JSXElement(element) => Expr::JSXElement(element.clone()).into(),
    JSXAttrValue::JSXFragment(fragment) => Expr::JSXFragment(fragment.clone()).into(),
    JSXAttrValue::JSXExprContainer(JSXExprContainer { expr, .. }) => match expr {
      JSXExpr::Expr(expr) => expr.clone(),
      _ => Expr::Lit(Lit::Bool(true.into())).into(),
    },
  }
}

/// Creates a synthetic `<Say>...</Say>` JSX element with given children.
/// Used for fallback wrapping of unknown JSX into a parseable format.
fn create_fake_say_jsx_element(children: Vec<JSXElementChild>) -> Box<JSXElement> {
  let name = JSXElementName::Ident("Say".into());

  JSXElement {
    span: DUMMY_SP,
    opening: JSXOpeningElement {
      span: DUMMY_SP,
      name: name.clone(),
      attrs: vec![],
      self_closing: false,
      type_args: None,
    },
    children,
    closing: Some(JSXClosingElement {
      span: DUMMY_SP,
      name: name.clone(),
    }),
  }
  .into()
}
