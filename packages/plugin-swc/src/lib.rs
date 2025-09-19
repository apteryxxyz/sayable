use swc_core::{
  ecma::{
    ast::{self as t, Program},
    visit::{fold_pass, Fold, FoldWith},
  },
  plugin::{plugin_transform, proxies::TransformPluginProgramMetadata},
};

use crate::{
  ast_generators::{generate_jsx_say_expression, generate_say_expression},
  ast_parsers::{
    parse_call_expression, parse_jsx_element, parse_jsx_self_closing_element,
    parse_tagged_template_expression, IdentifierStore,
  },
  ast_transformers::transform_import_declaration,
};

mod ast_generators;
mod ast_parsers;
mod ast_transformers;
mod generate_hash;
mod generate_icu_message_format;
mod message_types;

struct Visitor {}

impl Fold for Visitor {
  fn fold_import_decl(&mut self, node: t::ImportDecl) -> t::ImportDecl {
    transform_import_declaration(&node).unwrap_or(node)
  }

  fn fold_expr(&mut self, expr: t::Expr) -> t::Expr {
    let identifier_store = &mut IdentifierStore::new();

    match &expr {
      t::Expr::TaggedTpl(node) => {
        if let Some(message) = parse_tagged_template_expression(node, identifier_store) {
          return generate_say_expression(&message);
        }
      }

      t::Expr::Call(node) => {
        if let Some(message) = parse_call_expression(node, identifier_store) {
          return generate_say_expression(&message);
        }
      }

      _ => {}
    }

    expr.fold_children_with(self)
  }

  fn fold_jsx_element(&mut self, node: t::JSXElement) -> t::JSXElement {
    let identifier_store = &mut IdentifierStore::new();

    if let Some(message) = parse_jsx_element(&node, identifier_store) {
      generate_jsx_say_expression(&message)
    } else if let Some(message) = parse_jsx_self_closing_element(&node, identifier_store) {
      generate_jsx_say_expression(&message)
    } else {
      node.fold_children_with(self)
    }
  }
}

#[plugin_transform]
fn process_transform(program: Program, _: TransformPluginProgramMetadata) -> Program {
  let mut visitor = Visitor {};
  let transformer = fold_pass(&mut visitor);
  program.apply(transformer)
}
