import * as t from '@babel/types';
import {
  ArgumentMessage,
  ChoiceMessage,
  CompositeMessage,
  ElementMessage,
  type Message,
} from '@saykit/config/features/messages';

export function generateSayCallExpression(message: CompositeMessage) {
  const id = message.descriptor.id ?? message.toHashString();
  const children = generateChildExpressions(message.children);

  const properties = t.objectExpression([
    t.objectProperty(t.identifier('id'), t.stringLiteral(id)),
    // An identifier can repeat — the same argument interpolated twice — but it
    // is one property either way.
    //
    // Every value is emitted behind an underscore, which both makes a numbered
    // identifier a valid property name and keeps the message's values out of
    // the descriptor's own namespace: an argument named `id` no longer
    // displaces the message being looked up. The runtime strips exactly one
    // underscore back off.
    ...[...new Map(children).entries()].map(([ident, expr]) =>
      t.objectProperty(t.identifier(`_${ident}`), expr),
    ),
  ]);

  return t.callExpression(t.memberExpression(message.accessor, t.identifier('call')), [properties]);
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
