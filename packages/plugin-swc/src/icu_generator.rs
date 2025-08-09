/**
 * KEEP IN SYNC:
 * - `packages/tsc-plugin/src/icu-generator.ts`
 * - `packages/swc-plugin/src/icu_generator.rs`
 */
use crate::message_types::Message;

///
/// Generates the ICU MessageFormat string for a message.
///
pub fn generate_icu_message_format(message: &Message) -> String {
  match message {
    Message::Literal(message) => message.text.clone(),

    Message::Composite(message) => message
      .children
      .values()
      .map(generate_icu_message_format)
      .collect::<Vec<_>>()
      .join(""),

    Message::Argument(message) => format!("{{{}}}", message.identifier),

    Message::Choice(message) => {
      let options = message
        .children
        .iter()
        .map(|(k, m)| {
          let key = k.trim_matches(|c| c == '=' || c == ' ');
          format!("  {key} {{\n{}\n  }}", generate_icu_message_format(m))
        })
        .collect::<Vec<_>>()
        .join("\n");

      let mut format = message.kind.clone();
      if format == "ordinal" {
        format = "selectordinal".into();
      }
      format!("{{{}}}, {format},\n{options}", message.identifier)
    }
  }
}
