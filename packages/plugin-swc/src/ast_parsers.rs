/**
 * KEEP IN SYNC:
 * - `packages/plugin/src/ast-parser.ts`
 * - `packages/swc-plugin/src/ast_parser.rs`
 */
use crate::message_types::{
  ArgumentMessage, ChoiceMessage, CompositeMessage, LiteralMessage, Message,
};
use std::collections::BTreeMap;
use swc_core::{
  common::{pass::Either, SyntaxContext},
  ecma::ast::{self as t},
};

/// Parses a tagged template expression into a composite message.
///
/// #### Arguments
///
/// * `node` - The tagged template expression to parse.
/// * `extra` - Extra information about the node.
///
/// #### Returns
///
/// The parsed composite message, or `None` if the node is not a valid message.
///
/// #### Examples
///
/// ```ignore
/// say`message`;
/// object.say`message`;
/// say({ ...descriptor })`message`;
/// ```
pub fn parse_tagged_template_expression(
  node: &t::TaggedTpl,
  extra: &mut Extra,
) -> Option<CompositeMessage> {
  if is_say_identifier(&node.tag) {
    let expressions = &node.tpl.exprs;
    let quasis = &node.tpl.quasis;
    let mut segments = Vec::new();
    for (i, quasi) in quasis.iter().enumerate() {
      segments.push((i * 2, Either::Left(quasi)));
      if let Some(expr) = expressions.get(i) {
        segments.push((i * 2 + 1, Either::Right(expr)));
      }
    }

    let mut children = BTreeMap::new();
    for (i, segment) in segments {
      match segment {
        Either::Left(segment) => {
          let message = LiteralMessage {
            text: segment.raw.to_string(),
          };
          children.insert(i.to_string(), Message::Literal(message));
        }
        Either::Right(segment) => match segment.as_ref() {
          t::Expr::Call(call) => {
            extra.key = Some(i.to_string());
            let message =
              parse_call_expression(call, extra).and_then(|m| m.children.get("0").cloned());
            if let Some(message) = message {
              children.insert(i.to_string(), message);
            }
          }
          _ => {
            let identifier = match &segment.as_ref() {
              t::Expr::Ident(ident) => ident.sym.to_string(),
              _ => i.to_string(),
            };
            let message = ArgumentMessage {
              identifier,
              expression: segment.clone(),
            };
            children.insert(i.to_string(), Message::Argument(message));
          }
        },
      }
    }

    let expression = match &*node.tag {
      t::Expr::Call(call) => call.callee.as_expr().unwrap(),
      _ => &node.tag,
    };
    populate_extra(&node.tag, extra);

    return Some(CompositeMessage {
      expression: expression.clone(),
      children,
      context: extra.context.clone(),
    });
  }

  None
}

///
/// Parses a call expression into a composite message.
///
/// #### Arguments
///
/// * `node` - The call expression to parse.
/// * `extra` - Extra information about the node.
///
/// #### Returns
///
/// The parsed composite message, or `None` if the node is not a valid message.
///
/// #### Examples
/// ```ignore
/// say.plural(value, { ...choices })
/// object.say.plural(value, { ...choices })
/// say({ ...descriptor }).plural(value, { ...choices })
/// ```
///
pub fn parse_call_expression(
  node: &t::CallExpr, //
  extra: &mut Extra,
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
    let callee = node.callee.as_expr().unwrap().as_member().unwrap();
    let property = callee.prop.as_ident().unwrap();

    let key_expr = &node.args[0].expr;
    let obj_expr = &node.args[1].expr.as_object().unwrap();

    let mut children = BTreeMap::new();
    for prop in obj_expr.props.iter() {
      let t::PropOrSpread::Prop(boxed_prop) = prop else {
        continue;
      };
      let t::Prop::KeyValue(t::KeyValueProp { key, value }) = &**boxed_prop else {
        continue;
      };
      let key = get_property_name(key);

      let child = match value.as_ref() {
        t::Expr::Lit(t::Lit::Str(t::Str { value, .. })) => {
          let message = LiteralMessage {
            text: value.to_string(),
          };
          Some(Message::Literal(message))
        }
        t::Expr::Lit(t::Lit::Num(t::Number { value, .. })) => {
          let message = LiteralMessage {
            text: value.to_string(),
          };
          Some(Message::Literal(message))
        }
        t::Expr::Tpl(tpl) => {
          // Fake a tagged template expression
          let fake_tagged = t::TaggedTpl {
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
          Some(Message::Composite(
            parse_tagged_template_expression(&fake_tagged, extra).unwrap(),
          ))
        }
        _ => None,
      };

      if let Some(child) = child {
        children.insert(key, child);
      }
    }

    let key_ident = match &**key_expr {
      t::Expr::Ident(ident) => ident.sym.to_string(),
      _ => extra.key.as_ref().unwrap().to_string(),
    };
    let choice = Message::Choice(ChoiceMessage {
      kind: property.sym.to_string(),
      identifier: key_ident,
      expression: key_expr.clone(),
      children,
    });

    let expression = match &*callee.obj {
      t::Expr::Call(call) => call.callee.as_expr().unwrap(),
      _ => &callee.obj,
    };
    populate_extra(&callee.obj, extra);

    return Some(CompositeMessage {
      expression: expression.clone(),
      children: BTreeMap::from_iter([("0".to_string(), choice)]),
      context: extra.context.clone(),
    });
  }

  None
}

//

pub struct Extra {
  pub context: Option<String>,
  pub key: Option<String>,
}

fn populate_extra(node: &t::Expr, extra: &mut Extra) {
  let t::Expr::Call(t::CallExpr { args, .. }) = node else {
    return;
  };
  let Some(first_arg) = args.first() else {
    return;
  };
  let t::Expr::Object(t::ObjectLit { props, .. }) = &*first_arg.expr else {
    return;
  };

  for prop in props {
    let t::PropOrSpread::Prop(boxed_prop) = prop else {
      continue;
    };
    let t::Prop::KeyValue(t::KeyValueProp { key, value }) = &**boxed_prop else {
      continue;
    };

    let key = get_property_name(key);
    let t::Expr::Lit(t::Lit::Str(t::Str { value, .. })) = &**value else {
      continue;
    };

    // match key.as_str() {
    //   "context" => extra.context = Some(value.to_string()),
    //   _ => {}
    // }
    if key.as_str() == "context" {
      extra.context = Some(value.to_string());
    }
  }
}

fn is_say_identifier(node: &t::Expr) -> bool {
  match node {
    // say
    t::Expr::Ident(t::Ident { sym, .. }) => sym == "say",
    // object.say
    t::Expr::Member(t::MemberExpr {
      prop: t::MemberProp::Ident(t::IdentName { sym, .. }),
      ..
    }) => sym == "say",
    // say()
    t::Expr::Call(t::CallExpr {
      callee: t::Callee::Expr(callee),
      ..
    }) => is_say_identifier(callee),
    _ => false,
  }
}

fn get_property_name(node: &t::PropName) -> String {
  match node {
    t::PropName::Str(t::Str { value, .. }) => value.to_string(),
    t::PropName::Ident(t::IdentName { sym, .. }) => sym.to_string(),
    t::PropName::Num(t::Number { value, .. }) => value.to_string(),
    _ => "".to_string(),
  }
}
