use swc_core::{
  ecma::{
    ast::{self as t, Program},
    visit::{fold_pass, Fold, FoldWith},
  },
  plugin::{plugin_transform, proxies::TransformPluginProgramMetadata},
};

mod ast_generators;
mod ast_parsers;
mod ast_transformers;
mod generate_hash;
mod icu_generator;
mod message_types;

use crate::{
  ast_generators::generate_say_expression,
  ast_parsers::{parse_call_expression, parse_tagged_template_expression, Extra},
  ast_transformers::transform_import_declaration,
};

struct Visitor {}

impl Fold for Visitor {
  fn fold_import_decl(&mut self, mut node: t::ImportDecl) -> t::ImportDecl {
    transform_import_declaration(&mut node).unwrap_or(node)
  }

  fn fold_expr(&mut self, expr: t::Expr) -> t::Expr {
    let mut extra = Extra {
      context: None,
      key: None,
    };

    match &expr {
      t::Expr::TaggedTpl(node) => {
        if let Some(message) = parse_tagged_template_expression(node, &mut extra) {
          generate_say_expression(&message)
        } else {
          expr
        }
      }

      t::Expr::Call(node) => {
        if let Some(message) = parse_call_expression(node, &mut extra) {
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
fn process_transform(program: Program, _: TransformPluginProgramMetadata) -> Program {
  let mut visitor = Visitor {};
  let transformer = fold_pass(&mut visitor);
  program.apply(transformer)
}
