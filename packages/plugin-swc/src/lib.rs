use swc_core::{
  common::comments::Comments,
  ecma::{
    ast::{self as t, Program},
    visit::{fold_pass, Fold, FoldWith},
  },
  plugin::{plugin_transform, proxies::TransformPluginProgramMetadata},
};

use crate::{
  ast_generators::generate_say_expression,
  ast_parsers::{parse_call_expression, parse_tagged_template_expression},
};

mod ast_generators;
mod ast_parsers;
mod generate_hash;
mod icu_generator;
mod message_types;

pub struct Visitor<'a> {
  pub comments: Option<&'a dyn Comments>,
}

impl<'a> Fold for Visitor<'a> {
  fn fold_import_decl(&mut self, mut node: t::ImportDecl) -> t::ImportDecl {
    if node.src.value == *"sayable/macro" {
      node.src = Box::new(t::Str {
        span: node.src.span,
        value: "sayable".into(),
        raw: None,
      });
    }
    node
  }

  fn fold_expr(&mut self, expr: t::Expr) -> t::Expr {
    match &expr {
      t::Expr::TaggedTpl(node) => {
        if let Some(message) = parse_tagged_template_expression(node, &self.comments) {
          generate_say_expression(&message)
        } else {
          expr
        }
      }

      t::Expr::Call(node) => {
        if let Some(message) = parse_call_expression(node, &self.comments, "_".into()) {
          generate_say_expression(&message)
        } else {
          expr
        }
      }

      _ => expr.fold_children_with(self),
    }
  }
}

#[plugin_transform]
fn process_transform(program: Program, metadata: TransformPluginProgramMetadata) -> Program {
  let mut visitor = Visitor {
    comments: metadata.comments.as_ref().map(|rc| rc as &dyn Comments),
  };
  let transformer = fold_pass(&mut visitor);
  program.apply(transformer)
}
