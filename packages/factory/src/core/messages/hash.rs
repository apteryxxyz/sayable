use data_encoding::BASE64;
use sha2::{Digest, Sha256};
use wasm_bindgen::prelude::*;

/// Generates a hash from the given input and context.
/// Is later used as identifier for messages.
#[wasm_bindgen(js_name = "generateHash")]
pub fn generate_hash(input: String, context: Option<String>) -> String {
  let mut hasher = Sha256::new();

  hasher.update(input.as_bytes());
  hasher.update([0x1F]);
  hasher.update(context.unwrap_or("".to_string()).as_bytes());

  let result = hasher.finalize();
  BASE64.encode(result.as_ref())[..6].to_string()
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn generate_hash_from_an_input() {
    let hash = generate_hash("my message".into(), None);
    assert_eq!(hash, "vQhkQx");
  }

  #[test]
  fn generate_hash_from_an_input_and_context() {
    let hash = generate_hash("my message".into(), Some("some context".into()));
    assert_eq!(hash, "NHsKx2");
  }

  #[test]
  fn generate_different_hashes_for_different_contexts() {
    let without_context = generate_hash("my message".into(), None);
    let with_context = generate_hash("my message".into(), Some("some context".into()));

    assert_ne!(without_context, with_context);
  }

  #[test]
  fn generate_the_same_hash_if_context_is_falsy() {
    let without_context = generate_hash("my message".into(), None);
    let with_empty_context = generate_hash("my message".into(), Some("".into()));

    assert_eq!(without_context, with_empty_context);
  }
}
