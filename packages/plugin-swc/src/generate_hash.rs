/**
 * KEEP IN SYNC:
 * - `packages/plugin/src/generate-hash.ts`
 * - `packages/swc-plugin/src/generate_hash.rs`
 */
use data_encoding::BASE64;
use sha2::{Digest, Sha256};

///
/// Generates a unique hash from any string, can be used as a translation key.
///
pub fn generate_hash(input: String) -> String {
  let mut hasher = Sha256::new();
  hasher.update(input);
  let result = hasher.finalize();
  BASE64.encode(result.as_ref())[0..6].into()
}
