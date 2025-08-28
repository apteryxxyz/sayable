/**
 * KEEP IN SYNC:
 * - `packages/plugin/src/ast-transformers.ts`
 * - `packages/swc-plugin/src/ast_transformers.rs`
 */
use swc_core::ecma::ast::{self as t};

pub fn transform_import_declaration(node: &t::ImportDecl) -> Option<t::ImportDecl> {
  if node.src.value.starts_with("sayable") {
    return Some(transform_macro_import_declaration(node));
  }

  None
}

fn transform_macro_import_declaration(node: &t::ImportDecl) -> t::ImportDecl {
  let specifier = match &*node.src.value {
    _ => "sayable/runtime",
  };

  t::ImportDecl {
    src: Box::new(t::Str {
      span: node.src.span,
      value: specifier.into(),
      raw: None,
    }),
    ..node.clone()
  }
}
