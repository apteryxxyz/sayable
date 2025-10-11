use swc_core::common::sync::Lrc;
use swc_core::common::{comments::Comments, SourceFile};

use crate::core::messages::CompositeMessage;

/// Context for the visitor, used to share and accumulate data during AST traversal or analysis.
///
/// This includes immutable data like the source file and comment references,
/// as well as mutable data like collected messages and a counter-based identifier store.
pub struct Context {
  pub source_file: Option<Lrc<SourceFile>>,
  pub single_comments: Option<Lrc<dyn Comments>>,
  pub found_messages: Vec<CompositeMessage>,
  pub identifier_store: IdentifierStore,
}
impl Context {
  pub fn new(
    source_file: Option<Lrc<SourceFile>>,
    single_comments: Option<Lrc<dyn Comments>>,
  ) -> Context {
    Context {
      source_file,
      single_comments,
      found_messages: vec![],
      identifier_store: IdentifierStore::default(),
    }
  }
}

/// A store for generating simple numeric-based unique string identifiers.
///
/// Useful for tracking unnamed entities or generating consistent IDs across visits.
#[derive(Default)]
pub struct IdentifierStore {
  current: usize,
}
impl IdentifierStore {
  pub fn next(&mut self) -> String {
    let id = self.current;
    self.current += 1;
    id.to_string()
  }
  pub fn back(&mut self) {
    self.current = self.current.saturating_sub(1);
  }
  pub fn reset(&mut self) {
    self.current = 0;
  }
}
