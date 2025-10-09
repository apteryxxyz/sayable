mod core;
mod features;

use swc_core::ecma::visit::fold_pass;
use wasm_bindgen::prelude::*;

pub use crate::core::context::Context;
pub use crate::core::messages::convert::convert_message_to_icu;
pub use crate::core::messages::hash::generate_hash;
use crate::core::messages::CompositeMessage;
use crate::core::program::{parse_program, print_program};
pub use crate::core::visitor::Visitor;

/// Transform a JavaScript/TypeScript/JSX file into new source code with transpiled messages.
#[wasm_bindgen]
pub fn transform(id: &str, code: &str) -> String {
  console_error_panic_hook::set_once();

  if let Some((program, context)) = parse_program(id, code) {
    let mut visitor = Visitor::new(context);
    let program = program.apply(fold_pass(&mut visitor));
    print_program(&program, visitor.context)
  } else {
    code.to_string()
  }
}

/// Extracts all messages from the source code without transforming it.
#[wasm_bindgen]
pub fn extract(id: &str, code: &str) -> Vec<CompositeMessage> {
  console_error_panic_hook::set_once();

  if let Some((program, context)) = parse_program(id, code) {
    let mut visitor = Visitor::new(context);
    program.apply(fold_pass(&mut visitor));
    let context = visitor.context.borrow();
    context.found_messages.clone()
  } else {
    vec![]
  }
}
