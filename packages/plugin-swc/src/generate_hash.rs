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
