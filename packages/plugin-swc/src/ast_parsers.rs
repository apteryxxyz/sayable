/**
 * KEEP IN SYNC:
 * - `packages/plugin-tsc/src/ast-parsers.ts`
 * - `packages/plugin-swc/src/ast_parsers.rs`
 */
use crate::message_types::{
  ArgumentMessage, ChoiceMessage, CompositeMessage, ElementMessage, LiteralMessage, Message,
};
use regex::Regex;
use swc_core::{
  common::{SyntaxContext, DUMMY_SP},
  ecma::ast::{self as t},
};
use swc_ecma_lexer::common::parser::expr_ext::ExprExt;

enum Segment<'a> {
  Quasi(&'a t::TplElement),
  Expr(&'a t::Expr),
}

///
/// Parse a tagged template expression into maybe a composite message.
///
/// # Arguments
///
/// * `node` — Tagged template expression node
/// * `identifier_store` — The store to track generated identifiers
///
/// # Returns
///
/// Composite message option
///
pub fn parse_tagged_template_expression(
  node: &t::TaggedTpl,
  identifier_store: &mut IdentifierStore,
) -> Option<CompositeMessage> {
  if is_say_identifier(&node.tag) {
    // say`...` or say({...})`...`

    let expressions = &node.tpl.exprs;
    let quasis = &node.tpl.quasis;
    let mut segments = Vec::new();
    for (i, quasi) in quasis.iter().enumerate() {
      segments.push(Segment::Quasi(quasi));
      if let Some(expr) = expressions.get(i) {
        segments.push(Segment::Expr(expr));
      }
    }

    let mut children = Vec::new();
    for segment in segments {
      match segment {
        Segment::Quasi(segment) => {
          let message = LiteralMessage::new(segment.raw.to_string());
          children.push(Message::Literal(message));
        }

        Segment::Expr(segment) => {
          let message_opt = match segment {
            t::Expr::Call(segment) => {
              parse_call_expression(segment, identifier_store).map(Message::Composite)
            }

            t::Expr::TaggedTpl(segment) => {
              parse_tagged_template_expression(segment, identifier_store).map(Message::Composite)
            }

            _ => None,
          };

          let message = message_opt.unwrap_or_else(|| {
            let arg_msg = ArgumentMessage::new(
              get_property_name(segment, identifier_store),
              segment.clone().into(),
            );
            Message::Argument(arg_msg)
          });
          children.push(message);
        }
      }
    }

    let accessor = match &*node.tag {
      t::Expr::Call(call) => call.callee.as_expr().unwrap(),
      _ => &node.tag,
    };
    let descriptor = match &*node.tag {
      t::Expr::Call(t::CallExpr { args, .. }) => Some(args.first().unwrap().expr.as_expr()),
      _ => None,
    };
    let context = match descriptor {
      Some(_) => {
        find_property_value(descriptor.unwrap(), "context").and_then(|v| if_string_as_string(&v))
      }
      None => None,
    };

    return Some(CompositeMessage::new(accessor.clone(), children, context));
  }

  None
}

///
/// Parse a call expression into a choice message wrapped in a composite message.
///
/// # Arguments
///
/// * `node` — Call expression node
/// * `identifier_store` — The store to track generated identifiers
///
/// # Returns
///
/// Composite message with a single choice message child option
///
pub fn parse_call_expression(
  node: &t::CallExpr,
  identifier_store: &mut IdentifierStore,
) -> Option<CompositeMessage> {
  let is_say_callee = match node.callee.as_expr() {
    Some(expr) => is_say_identifier(expr),
    None => false,
  };
  let is_select_callee = match &node.callee {
    t::Callee::Expr(callee) => match &**callee {
      t::Expr::Member(t::MemberExpr {
        prop: t::MemberProp::Ident(ident),
        ..
      }) => ident.sym == "select" || ident.sym == "plural" || ident.sym == "ordinal",
      _ => false,
    },
    _ => false,
  };
  let is_select_args = node.args.len() == 2
    && matches!(*node.args[0].expr, _)
    && matches!(*node.args[1].expr, t::Expr::Object(_));

  if is_say_callee && is_select_callee && is_select_args {
    // say.plural(_, {...}) or say({...}).plural(_, {...})

    let mut branches = Vec::new();
    let obj = node.args[1].expr.as_object()?;
    for prop in &obj.props {
      let t::PropOrSpread::Prop(boxed_prop) = prop else {
        continue;
      };
      let t::Prop::KeyValue(t::KeyValueProp { key, value }) = &**boxed_prop else {
        continue;
      };

      // TODO: Review, compare to tsc
      let key = key.as_ident().unwrap().sym.to_string();

      let message_opt = match value.as_ref() {
        t::Expr::Lit(t::Lit::Str(t::Str { value, .. })) => {
          Some(Message::Literal(LiteralMessage::new(value.to_string())))
        }
        t::Expr::Lit(t::Lit::Num(t::Number { value, .. })) => {
          Some(Message::Literal(LiteralMessage::new(value.to_string())))
        }
        t::Expr::Tpl(tpl) if tpl.exprs.is_empty() && tpl.quasis.len() == 1 => Some(
          Message::Literal(LiteralMessage::new(tpl.quasis[0].raw.to_string())),
        ),

        t::Expr::TaggedTpl(tpl) => {
          parse_tagged_template_expression(tpl, identifier_store).map(Message::Composite)
        }

        _ => None,
      };

      let message = message_opt.unwrap_or_else(|| {
        let arg_msg =
          ArgumentMessage::new(get_property_name(value, identifier_store), value.clone());
        Message::Argument(arg_msg)
      });
      branches.push((key, message));
    }

    let callee = node.callee.as_expr()?.as_member()?;
    let property = callee.prop.as_ident()?;
    let value = &node.args[0].expr;

    let choice = ChoiceMessage::new(
      property.sym.to_string(),
      value.as_ident().unwrap().sym.to_string(),
      value.clone(),
      branches,
    );

    let accessor = match &*callee.obj {
      t::Expr::Call(call) => call.callee.as_expr().unwrap(),
      _ => &callee.obj,
    };

    return Some(CompositeMessage::new(
      accessor.clone(),
      vec![Message::Choice(choice)],
      None,
    ));
  }

  None
}

///
/// Parse a JSX element into a composite message.
///
/// # Arguments
///
/// * `node` — JSX element node
/// * `identifier_store` — The store to track generated identifiers
///
/// # Returns
///
/// Composite message option
///
pub fn parse_jsx_element(
  node: &t::JSXElement,
  identifier_store: &mut IdentifierStore,
) -> Option<CompositeMessage> {
  if match &node.opening.name {
    t::JSXElementName::Ident(t::Ident { sym, .. }) => sym == "Say",
    _ => false,
  } {
    // <Say>...</Say>

    let whitespace_re = Regex::new(r"\s+").unwrap();

    let mut children = Vec::new();
    for child in node.children.iter() {
      if let t::JSXElementChild::JSXText(t::JSXText { value, .. }) = child {
        let text = whitespace_re.replace_all(value, " ").to_string();
        let message = LiteralMessage::new(text);
        children.push(Message::Literal(message));
        continue;
      }

      if let t::JSXElementChild::JSXElement(child) = child {
        if child.closing.is_none() {
          // <Say.Select />
          let message = parse_jsx_self_closing_element(child, identifier_store);
          if let Some(message) = message {
            children.push(Message::Composite(message));
            continue;
          }
        }

        if child.closing.is_none() {
          // <br />
          let message = ElementMessage::new(identifier_store.next(), child.clone().into(), vec![]);
          children.push(Message::Element(message));
          continue;
        }

        // <Say>...</Say>
        let message = parse_jsx_element(child, identifier_store);
        if let Some(message) = message {
          children.push(Message::Composite(message));
          continue;
        }

        // <span>...</span> or <>...</>
        let tag = t::JSXElementName::Ident(t::Ident {
          span: DUMMY_SP,
          ctxt: SyntaxContext::empty(),
          sym: "Say".into(),
          optional: false,
        });
        let fake = t::JSXElement {
          span: DUMMY_SP,
          opening: t::JSXOpeningElement {
            name: tag.clone(),
            span: DUMMY_SP,
            attrs: vec![],
            self_closing: false,
            type_args: None,
          },
          children: child.children.clone(),
          closing: Some(t::JSXClosingElement {
            name: tag.clone(),
            span: DUMMY_SP,
          }),
        };

        // Preload the identifier to prevent out of order ids if
        // `parseJsxElement` requests ids
        let preloaded_identifier = identifier_store.next();
        let message = parse_jsx_element(&fake, identifier_store);
        if let Some(message) = message {
          children.push(Message::Element(ElementMessage::new(
            preloaded_identifier,
            child.clone().into(),
            message.children,
          )));
          continue;
        } else {
          // If the element is not valid, we need to backtrack the identifier
          identifier_store.back();
        }
      }

      if let t::JSXElementChild::JSXExprContainer(child) = child {
        if let t::JSXExpr::Expr(expr) = &child.expr {
          children.push(Message::Argument(ArgumentMessage {
            identifier: get_property_name(expr, identifier_store),
            expression: expr.clone(),
          }));
          continue;
        }
      }

      unimplemented!("{:?}", child);
    }

    let accessor = match &node.opening.name {
      t::JSXElementName::Ident(ident) => ident.clone().into(),
      _ => unreachable!(),
    };
    let descriptor = &t::Expr::JSXElement(Box::new(node.clone()));
    let context = find_property_value(descriptor, "context").and_then(|v| if_string_as_string(&v));

    return Some(CompositeMessage::new(accessor, children, context));
  }

  None
}

///
/// Parse a JSX self-closing element into a choice message wrapped in a composite message.
///
/// # Arguments
///
/// * `node` — JSX self-closing element node
/// * `identifier_store` — The store to track generated identifiers
///
/// # Returns
///
/// Composite message with a single choice message child option
///
pub fn parse_jsx_self_closing_element(
  node: &t::JSXElement,
  identifier_store: &mut IdentifierStore,
) -> Option<CompositeMessage> {
  let (kind, accessor) = match &node.opening {
    t::JSXOpeningElement {
      name:
        t::JSXElementName::JSXMemberExpr(t::JSXMemberExpr {
          obj: t::JSXObject::Ident(ident),
          prop,
          ..
        }),
      self_closing: true,
      ..
    } => (prop.sym.to_string(), t::Expr::Ident(ident.clone())),
    _ => return None,
  };

  if kind == "Select" || kind == "Plural" || kind == "Ordinal" {
    // <Say.Select /> or <Say.Plural /> or <Say.Ordinal />

    let safe_number_key_re = Regex::new(r"^_\d+$").unwrap();

    let mut branches = Vec::new();
    for prop in &node.opening.attrs {
      let t::JSXAttrOrSpread::JSXAttr(boxed_prop) = prop else {
        continue;
      };
      let t::JSXAttr {
        name,
        value: Some(value),
        ..
      } = boxed_prop
      else {
        continue;
      };

      let mut key = get_attribute_name(name, identifier_store);
      if key == "_" || key == "context" {
        continue;
      }

      if safe_number_key_re.is_match(key.as_str()) {
        key = key.replacen("_", "", 1);
      }

      match value {
        t::JSXAttrValue::Lit(t::Lit::Str(t::Str { value, .. })) => {
          let message = LiteralMessage::new(value.to_string());
          branches.push((key, Message::Literal(message)));
        }
        t::JSXAttrValue::Lit(t::Lit::Num(t::Number { value, .. })) => {
          let message = LiteralMessage::new(value.to_string());
          branches.push((key, Message::Literal(message)));
        }

        t::JSXAttrValue::JSXExprContainer(t::JSXExprContainer { expr, .. }) => {
          let tag = t::JSXElementName::Ident(t::Ident {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            sym: "Say".into(),
            optional: false,
          });
          let fake = t::JSXElement {
            span: DUMMY_SP,
            opening: t::JSXOpeningElement {
              name: tag.clone(),
              span: DUMMY_SP,
              attrs: vec![],
              self_closing: false,
              type_args: None,
            },
            children: vec![t::JSXElementChild::JSXExprContainer(t::JSXExprContainer {
              span: DUMMY_SP,
              expr: expr.clone(),
            })],
            closing: Some(t::JSXClosingElement {
              name: tag.clone(),
              span: DUMMY_SP,
            }),
          };

          let message = parse_jsx_element(&fake, identifier_store);
          if let Some(message) = message {
            branches.push((key, Message::Composite(message)));
          }
        }

        _ => continue,
      };
    }

    let value = find_attribute_value(node, "_");
    let identifier = value
      .as_ref()
      .and_then(|e| match e.as_ref() {
        t::Expr::Ident(ident) => Some(ident.sym.to_string()),
        _ => None,
      })
      .unwrap_or_else(|| identifier_store.next());

    let choice = ChoiceMessage::new(
      kind.to_lowercase(),
      identifier,
      value.unwrap().clone(),
      branches,
    );

    return Some(CompositeMessage::new(
      Box::new(accessor),
      vec![Message::Choice(choice)],
      None,
    ));
  }

  None
}

//

///
/// Check if an expression is a valid `say` identifier.
///
/// # Arguments
///
/// * `node` — Expression node to check
///
/// # Returns
///
/// `true` if the expression is a valid `say` identifier
///
fn is_say_identifier(node: &t::Expr) -> bool {
  match node {
    // say
    t::Expr::Ident(t::Ident { sym, .. }) => sym == "say",
    // object.say
    t::Expr::Member(t::MemberExpr { obj, prop, .. }) => {
      matches!(prop, t::MemberProp::Ident(t::IdentName { sym, .. }) if sym == "say")
        || is_say_identifier(obj)
    }
    // say()
    t::Expr::Call(t::CallExpr {
      callee: t::Callee::Expr(callee),
      ..
    }) => is_say_identifier(callee),
    _ => false,
  }
}

pub struct IdentifierStore {
  current: usize,
}
impl IdentifierStore {
  pub fn new() -> Self {
    Self { current: 0 }
  }
  pub fn next(&mut self) -> String {
    let id = self.current;
    self.current += 1;
    id.to_string()
  }
  pub fn back(&mut self) {
    self.current -= 1;
  }
}

///
/// Get the "name" of a node, used as the identifier for a message.
///
/// # Arguments
///
/// * `node` — Node to get the name of
/// * `identifier_store` — The store to track generated identifiers, fallback if no name could be determined
///
/// # Returns
///
/// The "name" of the node
///
fn get_property_name(node: &t::Expr, identifier_store: &mut IdentifierStore) -> String {
  match node {
    t::Expr::Ident(ident) => ident.sym.to_string(),

    t::Expr::Call(call) => match &call.callee {
      t::Callee::Expr(callee_expr) => match &**callee_expr {
        t::Expr::Member(member) => get_property_name(&member.obj, identifier_store),
        other => get_property_name(other, identifier_store),
      },
      _ => identifier_store.next(),
    },

    t::Expr::Member(member) => match &member.prop {
      t::MemberProp::Ident(ident) => ident.sym.to_string(),
      t::MemberProp::Computed(comp) => get_property_name(&comp.expr, identifier_store),
      _ => identifier_store.next(),
    },

    _ => identifier_store.next(),
  }
}

///
/// Get the "name" of a JSX attribute, used as the identifier for a message.
///
/// # Arguments
///
/// * `name` — JSX attribute name
/// * `identifier_store` — The store to track generated identifiers, fallback if no name could be determined
///
/// # Returns
///
/// The "name" of the JSX attribute
///
fn get_attribute_name(name: &t::JSXAttrName, identifier_store: &mut IdentifierStore) -> String {
  match name {
    t::JSXAttrName::Ident(t::IdentName { sym, .. }) => sym.to_string(),
    _ => identifier_store.next(),
  }
}

///
/// Get the value of a property with the given key.
///
/// # Arguments
///
/// * `node` — Object literal or JSX attributes
/// * `key` — Property key
///
/// # Returns
///
/// Property value expression, if found
///
fn find_property_value(node: &t::Expr, key: &str) -> Option<Box<t::Expr>> {
  if let t::Expr::Object(node) = node {
    for prop in &node.props {
      if let t::PropOrSpread::Prop(prop) = prop {
        if let t::Prop::KeyValue(t::KeyValueProp {
          key: t::PropName::Ident(ident),
          value,
        }) = &**prop
        {
          if ident.sym == key {
            return Some(value.clone());
          }
        }
      }
    }
  }

  None
}

///
/// Get the value of an attribute with the given key.
///
/// # Arguments
///
/// * `node` — JSX element node
/// * `key` — Attribute key
///
/// # Returns
///
/// Attribute value expression, if found
///
fn find_attribute_value(node: &t::JSXElement, key: &str) -> Option<Box<t::Expr>> {
  for attr in &node.opening.attrs {
    if let t::JSXAttrOrSpread::JSXAttr(t::JSXAttr {
      name: t::JSXAttrName::Ident(ident),
      value: Some(value),
      ..
    }) = attr
    {
      if ident.sym == key {
        match value {
          t::JSXAttrValue::Lit(value) => return Some(t::Expr::Lit(value.clone()).into()),
          t::JSXAttrValue::JSXExprContainer(t::JSXExprContainer { expr, .. }) => match expr {
            t::JSXExpr::Expr(inner_expr) => return Some(inner_expr.clone()),
            t::JSXExpr::JSXEmptyExpr(_) => return None,
          },
          _ => {}
        };
      }
    }
  }

  None
}

///
/// If the given node can be converted to a string, return it.
///
/// # Arguments
///
/// * `node` — Expression node
///
/// # Returns
///
/// String value, if found
///
fn if_string_as_string(node: &t::Expr) -> Option<String> {
  let node = match node {
    t::Expr::Lit(t::Lit::Str(t::Str { value, .. })) => value.to_string(),
    _ => return None,
  };

  Some(node)
}
