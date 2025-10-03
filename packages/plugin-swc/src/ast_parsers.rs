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

// Wouldn't surprise me if there are bugs in this, but I'm just so sick of porting to Rust atp

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
      segments.push((i * 2, Segment::Quasi(quasi)));
      if let Some(expr) = expressions.get(i) {
        segments.push((i * 2 + 1, Segment::Expr(expr)));
      }
    }

    let mut children = Vec::new();
    for (i, segment) in segments {
      match segment {
        Segment::Quasi(segment) => {
          let message = LiteralMessage::new(segment.raw.to_string());
          children.push((i.to_string(), Message::Literal(message)));
        }

        Segment::Expr(segment) => {
          let message_opt = match segment {
            t::Expr::Call(call) => {
              parse_call_expression(call, identifier_store).map(Message::Composite)
            }

            t::Expr::TaggedTpl(tpl) => {
              parse_tagged_template_expression(tpl, identifier_store).map(Message::Composite)
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

          children.push((i.to_string(), message));
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
      Some(_) => get_property_value(descriptor.unwrap(), "context"),
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

    let mut children = Vec::new();
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

      match value.as_ref() {
        t::Expr::Lit(t::Lit::Str(t::Str { value, .. })) => {
          let literal = LiteralMessage {
            text: value.to_string(),
          };
          children.push((key, Message::Literal(literal)));
        }
        t::Expr::Lit(t::Lit::Num(t::Number { value, .. })) => {
          let literal = LiteralMessage {
            text: value.to_string(),
          };
          children.push((key, Message::Literal(literal)));
        }

        t::Expr::Tpl(tpl) => {
          // Wrap template expression in fake say`...` element for recursion
          let fake = t::TaggedTpl {
            span: tpl.span,
            ctxt: SyntaxContext::empty(),
            tag: Box::new(t::Expr::Ident(t::Ident::new(
              "say".into(),
              tpl.span,
              SyntaxContext::empty(),
            ))),
            tpl: Box::new(tpl.clone()),
            type_params: None,
          };
          let message = parse_tagged_template_expression(&fake, identifier_store);
          if let Some(message) = message {
            children.push((key, Message::Composite(message)));
          }
        }

        _ => unimplemented!(),
      }
    }

    let callee = node.callee.as_expr()?.as_member()?;
    let property = callee.prop.as_ident()?;
    let value = &node.args[0].expr;

    let choice = ChoiceMessage::new(
      property.sym.to_string(),
      value.as_ident().unwrap().sym.to_string(),
      value.clone(),
      children,
    );

    let accessor = match &*callee.obj {
      t::Expr::Call(call) => call.callee.as_expr().unwrap(),
      _ => &callee.obj,
    };
    let descriptor = match &*callee.obj {
      t::Expr::Call(t::CallExpr { args, .. }) => Some(args.first().unwrap().expr.as_expr()),
      _ => None,
    };
    let context = match descriptor {
      Some(_) => get_property_value(descriptor.unwrap(), "context"),
      None => None,
    };

    return Some(CompositeMessage::new(
      accessor.clone(),
      vec![("0".to_string(), Message::Choice(choice))],
      context,
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
    for (i, child) in node.children.iter().enumerate() {
      match child {
        t::JSXElementChild::JSXText(t::JSXText { value, .. }) => {
          let text = whitespace_re.replace_all(value, " ").to_string();
          let message = LiteralMessage::new(text);
          children.push((i.to_string(), Message::Literal(message)));
        }

        t::JSXElementChild::JSXExprContainer(t::JSXExprContainer { expr, .. }) => match expr {
          t::JSXExpr::Expr(expr) => {
            let argument = ArgumentMessage {
              identifier: get_property_name(expr.as_ref(), identifier_store),
              expression: expr.clone(),
            };
            children.push((i.to_string(), Message::Argument(argument)));
          }
          _ => continue,
        },

        t::JSXElementChild::JSXElement(el) => {
          // Wrap expression in fake <Say>...</Say> element for recursion
          let fake = t::JSXElement {
            span: DUMMY_SP,
            opening: t::JSXOpeningElement {
              name: t::JSXElementName::Ident(t::Ident {
                span: DUMMY_SP,
                ctxt: SyntaxContext::empty(),
                sym: "Say".into(),
                optional: false,
              }),
              span: DUMMY_SP,
              attrs: vec![],
              self_closing: false,
              type_args: None,
            },
            children: el.children.clone(),
            closing: Some(t::JSXClosingElement {
              name: t::JSXElementName::Ident(t::Ident {
                span: DUMMY_SP,
                ctxt: SyntaxContext::empty(),
                sym: "Say".into(),
                optional: false,
              }),
              span: DUMMY_SP,
            }),
          };

          let preloaded_identifier = identifier_store.next();
          if let Some(message) = parse_jsx_element(&fake, identifier_store) {
            if let t::JSXElementChild::JSXElement(jsx_elem) = child {
              let expr = Box::new(t::Expr::JSXElement(Box::new(jsx_elem.as_ref().clone())));
              let message2 = ElementMessage::new(preloaded_identifier, expr, message.children);
              children.push((i.to_string(), Message::Element(message2)));
            }
          } else {
            identifier_store.back();
          }
        }

        _ => unimplemented!("{:?}", child),
      }
    }

    let accessor = match &node.opening.name {
      t::JSXElementName::Ident(ident) => ident.clone().into(),
      _ => unreachable!(),
    };
    let descriptor = &t::Expr::JSXElement(Box::new(node.clone()));
    let context = get_property_value(descriptor, "context");

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
    } => {
      if ident.sym.as_ref() == "Say"
        && (prop.sym == "Select" || prop.sym == "Plural" || prop.sym == "Ordinal")
      {
        (prop.sym.to_lowercase(), t::Expr::Ident(ident.clone()))
      } else {
        return None;
      }
    }
    _ => return None,
  };

  // <Say.Select /> or <Say.Plural /> or <Say.Ordinal />

  let mut value_expr: Option<Box<t::Expr>> = None;

  let mut children = Vec::new();
  for attr in &node.opening.attrs {
    if let t::JSXAttrOrSpread::JSXAttr(t::JSXAttr { name, value, .. }) = attr {
      let key = get_jsx_property_name(name, identifier_store);
      if key == "_" {
        match value.clone().unwrap() {
          t::JSXAttrValue::JSXExprContainer(t::JSXExprContainer {
            expr: t::JSXExpr::Expr(e),
            ..
          }) => value_expr = Some(e),
          t::JSXAttrValue::Lit(e) => value_expr = Some(Box::new(t::Expr::Lit(e))),
          _ => {}
        }
        continue;
      }
      if key == "context" {
        continue;
      }

      match value.as_ref().unwrap() {
        t::JSXAttrValue::Lit(t::Lit::Str(s)) => {
          let literal = LiteralMessage::new(s.value.to_string());
          children.push((key, Message::Literal(literal)));
        }

        t::JSXAttrValue::Lit(t::Lit::Num(t::Number { value, .. })) => {
          let literal = LiteralMessage::new(value.to_string());
          children.push((key, Message::Literal(literal)));
        }

        t::JSXAttrValue::JSXExprContainer(t::JSXExprContainer { expr, .. }) => {
          if let t::JSXExpr::Expr(expr) = expr {
            // Wrap expression in fake <Say>...</Say> element for recursion
            let fake = t::JSXElement {
              span: DUMMY_SP,
              opening: t::JSXOpeningElement {
                name: t::JSXElementName::Ident(t::Ident {
                  span: DUMMY_SP,
                  ctxt: SyntaxContext::empty(),
                  sym: "Say".into(),
                  optional: false,
                }),
                span: DUMMY_SP,
                attrs: vec![],
                self_closing: false,
                type_args: None,
              },
              children: vec![t::JSXElementChild::JSXExprContainer(t::JSXExprContainer {
                span: DUMMY_SP,
                expr: t::JSXExpr::Expr(expr.clone()),
              })],
              closing: Some(t::JSXClosingElement {
                name: t::JSXElementName::Ident(t::Ident {
                  span: DUMMY_SP,
                  ctxt: SyntaxContext::empty(),
                  sym: "Say".into(),
                  optional: false,
                }),
                span: DUMMY_SP,
              }),
            };

            if let Some(message) = parse_jsx_element(&fake, identifier_store) {
              children.extend(message.children);
            }
          }
        }

        _ => continue,
      }
    }
  }

  let identifier = value_expr
    .as_ref()
    .and_then(|e| match e.as_ref() {
      t::Expr::Ident(ident) => Some(ident.sym.to_string()),
      _ => None,
    })
    .unwrap_or_else(|| identifier_store.next());

  let choice = Message::Choice(ChoiceMessage::new(
    kind.to_lowercase(),
    identifier,
    value_expr.unwrap(),
    children,
  ));

  Some(CompositeMessage::new(
    Box::new(accessor),
    vec![("0".to_string(), choice)],
    None,
  ))
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
fn get_jsx_property_name(name: &t::JSXAttrName, identifier_store: &mut IdentifierStore) -> String {
  match name {
    t::JSXAttrName::Ident(t::IdentName { sym, .. }) => sym.to_string(),
    _ => identifier_store.next(),
  }
}

///
/// Get the value of property with the given key.
///
/// # Arguments
///
/// * `node` — Object literal or JSX attributes
/// * `key` — Property key
///
/// # Returns
///
/// Property value, a string or undefined
///
fn get_property_value(node: &t::Expr, key: &str) -> Option<String> {
  match node {
    t::Expr::Object(node) => {
      for prop in &node.props {
        if let t::PropOrSpread::Prop(prop) = prop {
          if let t::Prop::KeyValue(t::KeyValueProp {
            key: t::PropName::Ident(ident),
            value,
          }) = &**prop
          {
            if ident.sym == key {
              match value.as_ref() {
                t::Expr::Lit(t::Lit::Str(s)) => return Some(s.value.to_string()),
                _ => continue,
              }
            }
          }
        }
      }

      None
    }

    t::Expr::JSXElement(node) => {
      for attr in &node.opening.attrs {
        if let t::JSXAttrOrSpread::JSXAttr(t::JSXAttr {
          name: t::JSXAttrName::Ident(ident),
          value: Some(t::JSXAttrValue::Lit(t::Lit::Str(s))),
          ..
        }) = attr
        {
          if ident.sym == key {
            return Some(s.value.to_string());
          }
        }
      }

      None
    }

    _ => None,
  }
}
