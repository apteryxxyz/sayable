/**
 * KEEP IN SYNC:
 * - `packages/message-utils/src/icu-generator.ts`
 * - `packages/swc-plugin/src/icu_generator.rs`
 */
use crate::message_types::Message;

///
/// Generates the ICU MessageFormat string for a message.
///
pub fn generate_icu_message_format(message: &Message) -> String {
  match message {
    Message::Literal(message) => message.text.to_string(),

    Message::Argument(message) => format!("{{{}}}", message.identifier),

    Message::Element(message) => {
      let children = message
        .children
        .iter()
        .map(|(_, v)| generate_icu_message_format(v))
        .collect::<String>();
      format!(
        "<{}>{}</{}>",
        message.identifier, children, message.identifier
      )
    }

    Message::Choice(message) => {
      let options = message
        .children
        .iter()
        .map(|(index, message)| {
          let key = match index.parse::<i32>() {
            Ok(key) => format!("={key}"),
            Err(_) => index.to_string(),
          };
          format!("  {key} {{{}}}\n", generate_icu_message_format(message))
        })
        .collect::<String>();

      let format = match message.kind.as_str() {
        "ordinal" => "selectordinal",
        _ => message.kind.as_str(),
      };
      format!("{{{}, {format},\n{options}}}", message.identifier)
    }

    Message::Composite(message) => message
      .children
      .iter()
      .map(|(_, v)| generate_icu_message_format(v))
      .collect::<Vec<_>>()
      .join(""),
  }
}
