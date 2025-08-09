/**
 * KEEP IN SYNC:
 * - `packages/swc-plugin/src/ast_parser.rs`
 * - `packages/tsc-plugin/src/ast-parser.ts`
 */
use crate::message_types::{
  ArgumentMessage, ChoiceMessage, CompositeMessage, LiteralMessage, Message,
};
use std::collections::BTreeMap;
use swc_core::{
  common::{comments::Comments, pass::Either, SyntaxContext},
  ecma::ast::{self as t},
};

///
/// Parses a tagged template expression into a composite message.
/// #### Example
/// - say`Hello, world!`
/// - <object>.say`Hello, world!`
///
pub fn parse_tagged_template_expression(
  node: &t::TaggedTpl,
  comments: &dyn Comments,
) -> Option<CompositeMessage> {
  let is_say_tag = match &node.tag.as_ref() {
    // say`...`
    t::Expr::Ident(t::Ident { sym, .. }) if sym == "say" => true,
    // <object>.say`...`
    t::Expr::Member(t::MemberExpr {
      prop: t::MemberProp::Ident(t::IdentName { sym, .. }),
      ..
    }) if sym == "say" => true,
    _ => false,
  };

  if is_say_tag {
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
            text: segment.raw.as_str().into(),
          };
          children.insert(i.to_string(), Message::Literal(message));
        }
        Either::Right(segment) => match segment.as_ref() {
          t::Expr::Call(call) => {
            let message = parse_call_expression(call, &comments, i.to_string())
              .and_then(|m| m.children.get("0").cloned());
            if let Some(message) = message {
              children.insert(i.to_string(), message);
            }
          }
          _ => {
            let message = ArgumentMessage {
              identifier: match &segment.as_ref() {
                t::Expr::Ident(ident) => ident.sym.to_string(),
                _ => i.to_string(),
              },
              expression: segment.clone(),
            };
            children.insert(i.to_string(), Message::Argument(message));
          }
        },
      }
    }

    return Option::Some(CompositeMessage {
      expression: node.tag.clone(),
      children,
    });
  }

  None
}

///
/// Parses a call expression into a composite message.
/// #### Example
/// - say.select(gender, { male: 'He', female: 'She', other: 'They' })
/// - object.say.select(gender, { male: 'He', female: 'She', other: 'They' })
///
pub fn parse_call_expression(
  node: &t::CallExpr,
  comments: &dyn Comments,
  default_key: String,
) -> Option<CompositeMessage> {
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

  if is_select_callee && is_select_args {
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

      let key_str = match key {
        t::PropName::Str(t::Str { value, .. }) => value.to_string(),
        t::PropName::Ident(t::IdentName { sym, .. }) => sym.to_string(),
        t::PropName::Num(t::Number { value, .. }) => value.to_string(),
        _ => continue,
      };

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
            parse_tagged_template_expression(&fake_tagged, &comments).unwrap(),
          ))
        }
        _ => None,
      };

      if let Some(child) = child {
        children.insert(key_str, child);
      }
    }

    let key_ident = match &**key_expr {
      t::Expr::Ident(ident) => ident.sym.to_string(),
      _ => default_key.to_string(),
    };

    let choice = Message::Choice(ChoiceMessage {
      kind: property.sym.to_string(),
      identifier: key_ident,
      expression: key_expr.clone(),
      children,
    });

    return Some(CompositeMessage {
      expression: callee.obj.clone(),
      children: BTreeMap::from_iter([("0".to_string(), choice)]),
    });
  }

  None
}

// Comments and location are only ever used by the cli compiler, which uses babel every time
// So extractors for them are not implemented in the SWC plugin
