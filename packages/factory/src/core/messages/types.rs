use pastey::paste;
use serde::Serialize;
use swc_core::ecma::ast::Expr;
use wasm_bindgen::prelude::*;

use crate::core::messages::convert::convert_message_to_icu;
use crate::core::messages::hash::generate_hash;

macro_rules! define_message {
  (
    $(#[$struct_attr:meta])*
    $name:ident,
    $( public $pub_field_name:ident : $pub_field_ty:ty, )*
    $( private $priv_field_name:ident : $priv_field_ty:ty, )*
    $(,)?
  ) => {
    paste! {
      $(#[$struct_attr])*
      #[wasm_bindgen]
      #[derive(Debug, Clone, Serialize)]
      pub struct [<$name Message>] {
        $(
          #[wasm_bindgen(getter_with_clone)]
          pub $pub_field_name: $pub_field_ty,
        )*
        $(
          #[wasm_bindgen(skip)]
          #[serde(skip_serializing)]
          pub $priv_field_name: $priv_field_ty,
        )*
      }

      impl [<$name Message>] {
        pub fn new(
          $($pub_field_name: $pub_field_ty,)*
          $($priv_field_name: $priv_field_ty,)*
        ) -> [<$name Message>] {
          [<$name Message>] {
            $($pub_field_name,)*
            $($priv_field_name,)*
          }
        }
      }

      #[wasm_bindgen]
      impl [<$name Message>] {
        #[wasm_bindgen(js_name = "toICUString")]
        pub fn to_icu_string(&self) -> String {
          let m = Message { [<$name:lower>]: Some(self.clone()), ..Default::default() };
          m.to_icu_string()
        }

        #[wasm_bindgen(js_name = "toHashString")]
        pub fn to_hash_string(&self) -> String {
          let m = Message { [<$name:lower>]: Some(self.clone()), ..Default::default() };
          m.to_hash_string()
        }
      }

      impl From<[<$name Message>]> for Message {
        fn from (value: [<$name Message>]) -> Self {
          Message {
            [<$name:lower>]: Some(value),
            ..Default::default()
          }
        }
      }
    }
  };
}

define_message!(
  /// Represent a static, literal value within a message.
  Literal,
  public text : String,
);

define_message!(
  /// Represent a dynamic placeholder variable within a message.
  /// # Examples
  /// ```ts
  /// '{<identifier>}'
  /// '{name}'
  /// ```
  Argument,
  public identifier: String,
  private expression: Box<Expr>,
);

define_message!(
  /// Represents a part of the message wrapped in a specific XML-life tag.
  /// # Examples
  /// ```ts
  /// <<identifier>><children></<identifier>>
  /// <0>Hello, world!</0>
  /// ```
  Element,
  public identifier: String,
  public children: Vec<Message>,
  private expression: Box<Expr>,
);

#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Clone, Serialize)]
pub struct ChoiceMessageBranch {
  pub key: String,
  pub value: Message,
}

define_message!(
  /// Represents a number of messages that chooses among multiple branches based on a value.
  /// # Examples
  /// ```ts
  /// '{<identifier>, <kind>, <branches>}'
  /// '{gender, select, male {He} female {She} other {They}}'
  /// '{count, plural, one {1 item} other {# items}}'
  /// '{rank, selectordinal, =1 {1st} =2 {2nd} =3 {3rd} other {#th}}'
  /// ```
  Choice,
  public kind: String,
  public identifier: String,
  public branches: Vec<ChoiceMessageBranch>,
  private expression: Box<Expr>,
);

define_message!(
  /// Represents a sequence of messages, such as a template literal or concatenated parts.
  Composite,
  public context: Option<String>,
  public comments: Vec<String>,
  public references: Vec<String>,
  public children: Vec<Message>,
  private accessor: Box<Expr>,
);

//

#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Clone, Default, Serialize)]
pub struct Message {
  pub literal: Option<LiteralMessage>,
  pub argument: Option<ArgumentMessage>,
  pub element: Option<ElementMessage>,
  pub choice: Option<ChoiceMessage>,
  pub composite: Option<CompositeMessage>,
}
#[wasm_bindgen]
impl Message {
  #[wasm_bindgen(js_name = "toICUString")]
  pub fn to_icu_string(&self) -> String {
    convert_message_to_icu(self)
  }

  #[wasm_bindgen(js_name = "toHashString")]
  pub fn to_hash_string(&self) -> String {
    match &self.composite {
      Some(message) => generate_hash(self.to_icu_string(), message.context.clone()),
      None => generate_hash(self.to_icu_string(), None),
    }
  }
}
