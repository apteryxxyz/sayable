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
  internal_generate_icu_message_format(message)
    .trim()
    .to_string()
}

fn internal_generate_icu_message_format(message: &Message) -> String {
  match message {
    Message::Literal(message) => message.text.to_string(),

    Message::Argument(message) => format!("{{{}}}", message.identifier),

    Message::Element(message) => {
      let children = message
        .children
        .iter()
        .map(|(_, v)| internal_generate_icu_message_format(v))
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
          format!(
            "  {key} {{{}}}\n",
            internal_generate_icu_message_format(message)
          )
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
      .map(|(_, v)| internal_generate_icu_message_format(v))
      .collect::<Vec<_>>()
      .join(""),
  }
}

#[cfg(test)]
mod tests {
  use super::generate_icu_message_format;
  use crate::message_types::{
    ArgumentMessage, ChoiceMessage, CompositeMessage, ElementMessage, LiteralMessage, Message,
  };
  use swc_core::{common::util::take::Take, ecma::ast::Expr};

  #[test]
  fn generate_literal_messages() {
    let msg = LiteralMessage {
      text: "Hello".to_string(),
    };
    assert_eq!(generate_icu_message_format(&Message::Literal(msg)), "Hello");
  }

  #[test]
  fn generate_composite_messages() {
    let msg = CompositeMessage {
      accessor: Box::new(Expr::dummy()),
      children: vec![
        (
          "0".to_string(),
          Message::Literal(LiteralMessage {
            text: "Hello".to_string(),
          }),
        ),
        (
          "1".to_string(),
          Message::Literal(LiteralMessage {
            text: " world".to_string(),
          }),
        ),
      ]
      .into_iter()
      .map(|(key, val)| (key, val))
      .collect(),
      context: None,
    };
    assert_eq!(
      generate_icu_message_format(&Message::Composite(msg)),
      "Hello world"
    );
  }

  #[test]
  fn generate_argument_messages() {
    let msg = ArgumentMessage {
      identifier: "name".to_string(),
      expression: Box::new(Expr::dummy()),
    };
    assert_eq!(
      generate_icu_message_format(&Message::Argument(msg)),
      "{name}"
    );
  }

  #[test]
  fn generate_element_messages() {
    let msg = ElementMessage {
      identifier: "0".to_string(),
      expression: Box::new(Expr::dummy()),
      children: vec![(
        "0".to_string(),
        Message::Literal(LiteralMessage {
          text: "bold".to_string(),
        }),
      )]
      .into_iter()
      .map(|(key, val)| (key, val))
      .collect(),
    };
    assert_eq!(
      generate_icu_message_format(&Message::Element(msg)),
      "<0>bold</0>"
    );
  }

  #[test]
  fn generate_choice_messages_with_numeric_keys_as_equals() {
    let msg = ChoiceMessage {
      kind: "plural".to_string(),
      identifier: "count".to_string(),
      expression: Box::new(Expr::dummy()),
      children: vec![
        (
          "0".to_string(),
          Message::Literal(LiteralMessage {
            text: "none".to_string(),
          }),
        ),
        (
          "one".to_string(),
          Message::Literal(LiteralMessage {
            text: "one".to_string(),
          }),
        ),
        (
          "other".to_string(),
          Message::Literal(LiteralMessage {
            text: "many".to_string(),
          }),
        ),
      ]
      .into_iter()
      .map(|(key, val)| (key, val))
      .collect(),
    };
    assert_eq!(
      generate_icu_message_format(&Message::Choice(msg)),
      "{count, plural,\n  =0 {none}\n  one {one}\n  other {many}\n}"
    );
  }

  #[test]
  fn generate_choice_messages_with_ordinal_kind() {
    let msg = ChoiceMessage {
      kind: "ordinal".to_string(),
      identifier: "place".to_string(),
      expression: Box::new(Expr::dummy()),
      children: vec![
        (
          "one".to_string(),
          Message::Literal(LiteralMessage {
            text: "first".to_string(),
          }),
        ),
        (
          "two".to_string(),
          Message::Literal(LiteralMessage {
            text: "second".to_string(),
          }),
        ),
        (
          "other".to_string(),
          Message::Literal(LiteralMessage {
            text: "other".to_string(),
          }),
        ),
      ]
      .into_iter()
      .map(|(key, val)| (key, val))
      .collect(),
    };
    assert_eq!(
      generate_icu_message_format(&Message::Choice(msg)),
      "{place, selectordinal,\n  one {first}\n  two {second}\n  other {other}\n}"
    );
  }

  #[test]
  fn normalise_jsx_related_whitespace() {
    let msg = CompositeMessage {
      accessor: Box::new(Expr::dummy()),
      children: vec![
        (
          "0".to_string(),
          Message::Literal(LiteralMessage {
            text: "\n  Hello, ".to_string(),
          }),
        ),
        (
          "1".to_string(),
          Message::Argument(ArgumentMessage {
            identifier: "name".to_string(),
            expression: Box::new(Expr::dummy()),
          }),
        ),
        (
          "2".to_string(),
          Message::Literal(LiteralMessage {
            text: "!\n".to_string(),
          }),
        ),
      ],
      context: None,
    };
    assert_eq!(
      generate_icu_message_format(&Message::Composite(msg)),
      "Hello, {name}!"
    );
  }
}
