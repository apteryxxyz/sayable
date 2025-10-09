use std::cell::RefCell;
use std::rc::Rc;

use swc_core::common::comments::SingleThreadedComments;
use swc_core::common::sync::Lrc;
use swc_core::common::{FileName, SourceFile, SourceMap};
use swc_core::ecma::ast::Program;
use swc_core::ecma::codegen::to_code_with_comments;
use swc_core::ecma::parser::{EsSyntax, Parser, StringInput, Syntax, TsSyntax};

use crate::core::context::Context;

/// Parses JavaScript or TypeScript source code into a SWC [`Program`] AST, and initialises a shared [`Context`].
///
/// Determines the syntax based on the file extension:
/// - `.ts`, `.tsx` → TypeScript
/// - `.js`, `.jsx` → ECMAScript (with JSX support if ending in `x`)
pub fn parse_program(id: &str, code: &str) -> Option<(Program, Rc<RefCell<Context>>)> {
  let syntax = match id {
    s if s.ends_with(".ts") || s.ends_with(".tsx") => Syntax::Typescript(TsSyntax {
      tsx: s.ends_with("x"),
      ..Default::default()
    }),
    s if s.ends_with(".js") || s.ends_with(".jsx") => Syntax::Es(EsSyntax {
      jsx: s.ends_with("x"),
      ..Default::default()
    }),
    _ => return None,
  };

  let source_map = Rc::new(SourceMap::default());
  let filename = FileName::Real(id.into());
  let source_file: Lrc<SourceFile> = source_map.new_source_file(filename.into(), code.to_string());
  let comments = Rc::new(SingleThreadedComments::default());

  let mut parser = Parser::new(syntax, StringInput::from(&*source_file), Some(&comments));
  let program = parser.parse_program().unwrap();
  let context = Rc::new(RefCell::new(Context::new(Some(source_file), comments)));
  Some((program, context))
}

/// Converts a parsed [`Program`] back into a string of source code, preserving comments where possible.
pub fn print_program(program: &Program, context: Rc<RefCell<Context>>) -> String {
  to_code_with_comments(Some(&context.borrow().single_comments), program)
}
