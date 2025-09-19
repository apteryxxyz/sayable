/**
 * KEEP IN SYNC:
 * - `packages/message-utils/src/generate-hash.ts`
 * - `packages/swc-plugin/src/generate_hash.rs`
 */
use data_encoding::BASE64;
use sha2::{Digest, Sha256};

///
/// Generates a unique hash from any string, can be used as a translation key.
///
pub fn generate_hash(input: &str, context: Option<&str>) -> String {
  let mut hasher = Sha256::new();

  hasher.update(input.as_bytes());
  hasher.update([0x1F]);
  hasher.update(context.unwrap_or("").as_bytes());

  let result = hasher.finalize();
  BASE64.encode(result.as_ref())[..6].to_string()
}

#[cfg(test)]
mod tests {
  use super::generate_hash;

  #[test]
  fn generate_hash_from_an_input() {
    let hash = generate_hash("my message", None);
    assert_eq!(hash, "vQhkQx");
  }

  #[test]
  fn generate_hash_from_an_input_and_context() {
    let hash = generate_hash("my message", Some("some context"));
    assert_eq!(hash, "NHsKx2");
  }

  #[test]
  fn generate_different_hashes_for_different_contexts() {
    let without_context = generate_hash("my message", None);
    let with_context = generate_hash("my message", Some("some context"));

    assert_ne!(without_context, with_context);
  }

  #[test]
  fn generate_the_same_hash_if_context_is_falsy() {
    let without_context = generate_hash("my message", None);
    let with_falsy_context = generate_hash("my message", Some(""));

    assert_eq!(with_falsy_context, without_context);
  }
}
