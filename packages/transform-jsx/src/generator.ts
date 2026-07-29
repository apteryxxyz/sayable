import * as t from '@babel/types';
import {
  ArgumentMessage,
  ChoiceMessage,
  CompositeMessage,
  ElementMessage,
  type Message,
} from '@saykit/config/features/messages';

export function generateSayJSXElement(message: CompositeMessage) {
  const id = message.descriptor.id ?? message.toHashString();
  const children = generateChildExpressions(message.children);

  const attributes = [
    t.jsxAttribute(t.jsxIdentifier('id'), t.stringLiteral(id)),
    ...(message.whitespace === undefined
      ? []
      : [
          t.jsxAttribute(
            t.jsxIdentifier('whitespace'),
            t.jsxExpressionContainer(t.booleanLiteral(message.whitespace)),
          ),
        ]),
    // An identifier can repeat — the same argument interpolated twice, or two
    // identical elements sharing a tag — but it is one prop either way.
    //
    // Every value is emitted behind an underscore, which both makes numbered
    // identifiers valid prop names and keeps them out of `Say`'s own namespace:
    // no name a message can choose collides with `id` or `whitespace`, or with
    // `key` and `ref` which React never passes on, and a prop added to `Say`
    // later claims nothing. The runtime strips exactly one underscore back off.
    ...[...new Map(children).entries()].map(([k, e]) =>
      t.jsxAttribute(t.jsxIdentifier(`_${k}`), t.jsxExpressionContainer(e)),
    ),
  ];

  return t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier('Say'), attributes, true), null, []);
}

function generateChildExpressions(messages: Message[]) {
  return messages.reduce<[string, t.Expression][]>((c, m) => {
    if (m instanceof ArgumentMessage) {
      c.push([String(m.identifier), m.expression]);
    }

    if (m instanceof ElementMessage) {
      c.push([String(m.identifier), m.expression]);
      c.push(...generateChildExpressions(m.children));
    }

    if (m instanceof ChoiceMessage) {
      c.push([String(m.identifier), m.expression]);
      c.push(...generateChildExpressions(m.branches.map((b) => b.value)));
    }

    if (m instanceof CompositeMessage) {
      c.push(...generateChildExpressions(m.children));
    }

    return c;
  }, []);
}
