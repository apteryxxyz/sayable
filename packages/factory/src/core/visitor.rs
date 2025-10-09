use std::cell::RefCell;
use std::rc::Rc;

use swc_core::ecma::ast::{Expr, JSXElement};
use swc_core::ecma::visit::{Fold, FoldWith};

use crate::core::context::Context;
use crate::features::js::generator::generate_say_call_expression;
use crate::features::js::parser::{parse_call_expression, parse_tagged_template};
use crate::features::jsx::generator::generate_say_jsx_element;
use crate::features::jsx::parser::{parse_jsx_container_element, parse_jsx_self_closing_element};

/// AST visitor that processes expressions and JSX elements to extract message data,
/// and replaces matching constructs with generated calls.
///
/// This visitor is designed to be used with the SWC compiler infrastructure.
/// It walks the AST, identifies tagged template expressions, call expressions, and JSX elements
/// that match a certain pattern, collects metadata about them, and rewrites them using code generators.
pub struct Visitor {
  pub context: Rc<RefCell<Context>>,
}
impl Visitor {
  pub fn new(context: Rc<RefCell<Context>>) -> Self {
    Self { context }
  }
}

impl Fold for Visitor {
  fn fold_expr(&mut self, expr: Expr) -> Expr {
    let message = match &expr {
      Expr::TaggedTpl(tagged_tpl) => parse_tagged_template(&self.context, tagged_tpl),
      Expr::Call(call) => parse_call_expression(&self.context, call),
      _ => None,
    };

    if let Some(message) = message {
      self
        .context
        .borrow_mut()
        .found_messages
        .push(message.clone());
      self.context.borrow_mut().identifier_store.reset();
      Expr::Call(generate_say_call_expression(&message))
    } else {
      expr.fold_children_with(self)
    }
  }

  fn fold_jsx_element(&mut self, element: JSXElement) -> JSXElement {
    let message = match element.opening.self_closing {
      false => parse_jsx_container_element(&self.context, &element),
      true => parse_jsx_self_closing_element(&self.context, &element),
    };

    if let Some(message) = message {
      self
        .context
        .borrow_mut()
        .found_messages
        .push(message.clone());
      self.context.borrow_mut().identifier_store.reset();
      generate_say_jsx_element(&message)
    } else {
      element.fold_children_with(self)
    }
  }
}
