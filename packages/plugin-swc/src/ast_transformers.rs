/**
 * KEEP IN SYNC:
 * - `packages/plugin-tsc/src/ast-transformers.ts`
 * - `packages/plugin-swc/src/ast_transformers.rs`
 */
use swc_core::ecma::ast::{self as t};

pub fn transform_import_declaration(node: &t::ImportDecl) -> Option<t::ImportDecl> {
  if node.src.value.contains("sayable") {
    return Some(transform_macro_import_declaration(node));
  }

  None
}

fn transform_macro_import_declaration(node: &t::ImportDecl) -> t::ImportDecl {
  let specifier = match &*node.src.value {
    "sayable" => "sayable/runtime",
    "@sayable/react" => "@sayable/react/runtime",
    _ => node.src.value.as_str(),
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
