use std::cell::RefCell;
use std::rc::Rc;

use sayable_factory::{Context, Visitor};
// use swc_core::common::sync::Lrc;
// use swc_core::common::SourceFile;
use swc_core::ecma::ast::Program;
use swc_core::ecma::visit::fold_pass;
use swc_core::plugin::{plugin_transform, proxies::TransformPluginProgramMetadata};

#[plugin_transform]
fn process_transform(program: Program, metadata: TransformPluginProgramMetadata) -> Program {
  let source_map = Rc::new(metadata.source_map);
  #[allow(clippy::map_clone)]
  let source_file = source_map
    .source_file
    .get()
    .map(|source_file| source_file.clone());

  let comments = Rc::new(metadata.comments.unwrap());
  let context = Rc::new(RefCell::new(Context::new(source_file, comments)));
  let visitor = Visitor::new(context);
  program.apply(fold_pass(visitor))
}
