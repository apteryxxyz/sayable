use wasm_bindgen::prelude::*;

use crate::core::messages::Message;

/// Generate the ICU string representation of a message.
#[wasm_bindgen(js_name = "convertMessageToICU")]
pub fn convert_message_to_icu(message: &Message) -> String {
  fn internal_convert_message_to_icu(message: &Message) -> String {
    match (
      &message.literal,
      &message.argument,
      &message.element,
      &message.choice,
      &message.composite,
    ) {
      // literal
      (Some(message), None, None, None, None) => message.text.clone(),

      // argument
      (None, Some(message), None, None, None) => format!("{{{}}}", message.identifier),

      // element
      (None, None, Some(message), None, None) => {
        let children = message
          .children
          .iter()
          .map(internal_convert_message_to_icu)
          .collect::<String>();

        let identifier = &message.identifier;
        if children.is_empty() {
          format!("<{identifier}/>")
        } else {
          format!("<{identifier}>{children}</{identifier}>")
        }
      }

      // choice
      (None, None, None, Some(message), None) => {
        let branches = message
          .branches
          .iter()
          .map(|branch| {
            let (i, message) = (branch.key.clone(), branch.value.clone());
            let key = match i.parse::<i32>() {
              Ok(key) => format!("={key}"),
              Err(_) => i.to_string(),
            };
            format!(
              "  {key} {{{}}}\n",
              internal_convert_message_to_icu(&message)
            )
          })
          .collect::<String>();

        let format = match message.kind.as_str() {
          "ordinal" => "selectordinal",
          other => other,
        };
        format!("{{{}, {format},\n{branches}}}", message.identifier)
      }

      // composite
      (None, None, None, None, Some(message)) => message
        .children
        .iter()
        .map(internal_convert_message_to_icu)
        .collect::<String>(),

      _ => unreachable!("message must have exactly one variant: {:?}", message),
    }
  }

  internal_convert_message_to_icu(message).trim().to_string()
}

#[cfg(test)]
mod tests {
  use swc_core::{common::util::take::Take, ecma::ast::Expr};

  use super::*;
  use crate::core::messages::*;

  #[test]
  fn generate_literal_message() {
    let message = LiteralMessage::new("Hello, world!".into());
    assert_eq!(
      convert_message_to_icu(&Message::from(message)),
      "Hello, world!"
    );
  }

  #[test]
  fn generate_argument_message() {
    let message = ArgumentMessage::new("name".into(), Expr::dummy().into());
    assert_eq!(convert_message_to_icu(&Message::from(message)), "{name}");
  }

  #[test]
  fn generate_element_message() {
    let message = ElementMessage::new(
      "0".into(),
      vec![LiteralMessage::new("Hello, world!".into()).into()],
      Expr::dummy().into(),
    );
    assert_eq!(
      convert_message_to_icu(&Message::from(message)),
      "<0>Hello, world!</0>"
    );
  }

  #[test]
  fn generate_choice_message() {
    let message = ChoiceMessage::new(
      "plural".into(),
      "count".into(),
      vec![
        ChoiceMessageBranch {
          key: "1".into(),
          value: LiteralMessage::new("item".into()).into(),
        },
        ChoiceMessageBranch {
          key: "other".into(),
          value: LiteralMessage::new("items".into()).into(),
        },
      ],
      Expr::dummy().into(),
    );
    assert_eq!(
      convert_message_to_icu(&Message::from(message)),
      "{count, plural,\n  =1 {item}\n  other {items}\n}"
    );
  }

  #[test]
  fn generate_composite_message() {
    let message = CompositeMessage::new(
      None,
      vec![],
      vec![],
      vec![
        LiteralMessage::new("Hello, ".into()).into(),
        ArgumentMessage::new("name".into(), Expr::dummy().into()).into(),
        LiteralMessage::new("!".into()).into(),
      ],
      Expr::dummy().into(),
    );
    assert_eq!(
      convert_message_to_icu(&Message::from(message)),
      "Hello, {name}!"
    );
  }
}
