/**
 * KEEP IN SYNC:
 * - `packages/plugin/src/ast-generator.ts`
 * - `packages/swc-plugin/src/ast_generator.rs`
 */

import { generateHash, generateIcuMessageFormat } from '@sayable/message-utils';
import type t from 'typescript';
import { factory as f } from 'typescript';
import type { ChoiceMessage, CompositeMessage } from './message-types.js';

/**
 * Generates the `say` expression for a message.
 */
export function generateSayExpression(message: CompositeMessage) {
  const id = generateHash(generateIcuMessageFormat(message), message.context);
  const entries = new Map<string, t.Expression>([
    ['id', f.createStringLiteral(id)],
    ...generateChildExpressions(message.children),
  ]);

  const properties = [...entries].map(([k, v]) =>
    f.createPropertyAssignment(f.createIdentifier(k), v),
  );

  return f.createCallExpression(
    f.createPropertyAccessExpression(message.expression, 'say'),
    undefined,
    [f.createObjectLiteralExpression(properties, true)],
  );
}

/**
 * Generates the child expressions for a message.
 */
function* generateChildExpressions(
  children: ChoiceMessage['children'],
): Generator<[string, t.Expression]> {
  for (const [, message] of Object.entries(children)) {
    switch (message.type) {
      case 'argument': {
        yield [String(message.identifier), message.expression];
        break;
      }

      case 'choice': {
        yield [String(message.identifier), message.expression];
        yield* generateChildExpressions(message.children);
        break;
      }
    }
  }
}
