use std::cell::RefCell;
use std::rc::Rc;

use swc_core::common::{BytePos, Spanned};
use swc_core::ecma::ast::*;

use crate::core::context::Context;
use crate::core::messages::{
  ArgumentMessage, ChoiceMessage, ChoiceMessageBranch, CompositeMessage, LiteralMessage, Message,
};

fn parse_expression(ctx: &Rc<RefCell<Context>>, expr: &Expr, fallback: bool) -> Option<Message> {
  let msg = match &expr {
    Expr::TaggedTpl(tagged_tpl) => parse_tagged_template(ctx, tagged_tpl),
    Expr::Call(call) => parse_call_expression(ctx, call),
    _ => None,
  };

  if let Some(msg) = msg {
    Some(msg.into())
  } else if fallback {
    Some(ArgumentMessage::new(use_expression_key(ctx, expr), expr.clone().into()).into())
  } else {
    None
  }
}

/// Parses a tagged template literal (e.g., ``say`Hello ${name}` ``) into a [`CompositeMessage`].
///
/// Extracts the raw strings and embedded expressions as individual child messages.
pub fn parse_tagged_template(
  ctx: &Rc<RefCell<Context>>,
  tagged_tpl: &TaggedTpl,
) -> Option<CompositeMessage> {
  let (accessor, descriptor, _) = process_expression(&tagged_tpl.tag)?;

  if true {
    let mut children = Vec::new();
    for (i, quasi) in tagged_tpl.tpl.quasis.iter().enumerate() {
      children.push(LiteralMessage::new(quasi.raw.to_string()).into());
      if let Some(expr) = tagged_tpl.tpl.exprs.get(i) {
        children.push(parse_expression(ctx, expr, true).unwrap());
      }
    }

    let context = descriptor
      .and_then(|obj| find_property_value(obj, "context"))
      .and_then(|val| {
        val
          .as_lit()
          .map(|lit| lit.as_str().map(|str| str.value.to_string()))
      })
      .flatten();

    return Some(CompositeMessage::new(
      context,
      get_position_comments(ctx, tagged_tpl.tag.span_lo()),
      get_position_reference(ctx, tagged_tpl.tag.span_lo()).map_or([].into(), |s| [s].into()),
      children,
      accessor.clone().into(),
    ));
  }

  None
}
/// Parses a call expression (e.g., `say.select(...)`) into a [`CompositeMessage`] if it matches
/// a supported message type like `select`, `plural`, or `ordinal`.
pub fn parse_call_expression(
  ctx: &Rc<RefCell<Context>>,
  call: &CallExpr,
) -> Option<CompositeMessage> {
  let (accessor, descriptor, kind) = process_expression(&**call.callee.as_expr()?)?;

  if matches!(kind.as_deref(), Some("select" | "ordinal" | "plural")) {
    if call.args.len() != 2 {
      return None;
    }
    let obj = call.args[1].expr.as_object()?;

    let mut branches = Vec::new();
    for prop in &obj.props {
      let PropOrSpread::Prop(prop) = prop else {
        continue;
      };
      let Prop::KeyValue(prop) = &**prop else {
        continue;
      };

      let key = use_property_name(ctx, &prop.key);
      let value = &*prop.value;

      let msg_opt: Option<Message> = match value {
        Expr::Lit(Lit::Str(str)) => Some(LiteralMessage::new(str.value.to_string()).into()),
        Expr::Call(call) => parse_call_expression(ctx, call).map(|m| m.into()),
        Expr::TaggedTpl(tagged_tpl) => parse_tagged_template(ctx, tagged_tpl).map(|m| m.into()),
        _ => None,
      };

      let msg = msg_opt.unwrap_or_else(|| {
        ArgumentMessage::new(use_expression_key(ctx, value), value.clone().into()).into()
      });
      branches.push(ChoiceMessageBranch { key, value: msg });
    }

    //

    let value = &call.args[0].expr;

    let choice = ChoiceMessage::new(
      kind.unwrap().to_string(),
      use_expression_key(ctx, value),
      branches,
      value.clone(),
    );

    let context = descriptor
      .and_then(|obj| find_property_value(obj, "context"))
      .and_then(|val| {
        val
          .as_lit()
          .map(|lit| lit.as_str().map(|str| str.value.to_string()))
      })
      .flatten();

    return Some(CompositeMessage::new(
      context,
      get_position_comments(ctx, call.callee.as_expr()?.span_lo()),
      get_position_reference(ctx, call.callee.as_expr()?.span_lo())
        .map_or([].into(), |s| [s].into()),
      vec![choice.into()],
      accessor.clone().into(),
    ));
  }

  None
}

/// Generates a key for an expression to uniquely identify it in messages.
///
/// For identifiers, uses the identifier name. For others, uses an auto-incrementing ID.
pub fn use_expression_key(ctx: &Rc<RefCell<Context>>, expr: &Expr) -> String {
  match expr {
    Expr::Ident(ident) => ident.sym.to_string(),
    _ => ctx.borrow_mut().identifier_store.next(),
  }
}

/// Extracts translator comments at a given byte position.
///
/// Only includes comments starting with `translators:` (case-insensitive).
pub fn get_position_comments(ctx: &Rc<RefCell<Context>>, pos: BytePos) -> Vec<String> {
  ctx
    .borrow()
    .single_comments
    .get_leading(pos)
    .unwrap_or_default()
    .iter()
    .filter_map(|cmt| {
      let text = cmt.text.trim();
      text
        .to_lowercase()
        .starts_with("translators:")
        .then(|| text[12..].trim().to_string())
    })
    .collect()
}

/// Creates a human-readable source reference from a byte position (e.g. `"file.ts:42"`).
pub fn get_position_reference(ctx: &Rc<RefCell<Context>>, pos: BytePos) -> Option<String> {
  if let Some(file) = ctx.borrow().source_file.as_ref() {
    let path = file.name.to_string();
    let line = file.lookup_line(pos)?;
    Some(format!("{}:{}", path, line + 1))
  } else {
    None
  }
}

/// Recursively processes an expression to extract:
/// - The accessor expression (e.g., `say`, `intl.say`)
/// - An optional descriptor object (e.g., options passed as an argument)
/// - An optional message kind (e.g., `"plural"`, `"select"`)
fn process_expression(expr: &Expr) -> Option<(&Expr, Option<&ObjectLit>, Option<String>)> {
  match expr {
    Expr::Ident(ident) if ident.sym.eq("say") => Some((expr, None, None)),

    Expr::Call(CallExpr { callee, args, .. }) => {
      let (ident, _, _) = process_expression(callee.as_expr()?)?;
      if args.len() == 1 && args[0].expr.as_object().is_some() {
        Some((ident, Some(args[0].expr.as_object()?), None))
      } else {
        None
      }
    }

    Expr::Member(MemberExpr { obj, prop, .. }) => {
      if let Some((accessor, descriptor, _)) = process_expression(obj) {
        let kind = prop.as_ident().map(|i| i.sym.to_string());
        Some((accessor, descriptor, kind))
      } else if prop.as_ident()?.sym.eq("say") {
        Some((expr, None, None))
      } else {
        None
      }
    }

    _ => None,
  }
}

/// Extracts a property key from a [`PropName`] node.
fn use_property_name(ctx: &Rc<RefCell<Context>>, name: &PropName) -> String {
  match name {
    PropName::Ident(ident) => ident.sym.to_string(),
    PropName::Str(str) => str.value.to_string(),
    PropName::Num(num) => num.value.to_string(),
    PropName::BigInt(bigint) => bigint.value.to_string(),
    _ => ctx.borrow_mut().identifier_store.next(),
  }
}

/// Searches an object literal for a key and returns its associated value.
fn find_property_value(obj: &ObjectLit, key: &str) -> Option<Expr> {
  for prop in &obj.props {
    if let PropOrSpread::Prop(prop) = prop {
      if let Prop::KeyValue(kv) = &**prop {
        if kv.key.as_ident()?.sym.eq(key) {
          return Some(*kv.value.clone());
        }
      }
    }
  }

  None
}
