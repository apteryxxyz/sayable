/**
 * KEEP IN SYNC:
 * - `packages/plugin-tsc/src/ast-generators.ts`
 * - `packages/plugin-swc/src/ast_generators.rs`
 */
import t, { factory as f } from 'typescript';
import { generateHash } from './generate-hash.js';
import { generateIcuMessageFormat } from './generate-icu-message-format.js';
import type { CompositeMessage, Message } from './message-types.js';

export function generateSayExpression(message: CompositeMessage) {
  const id = generateHash(generateIcuMessageFormat(message), message.context);
  const children = new Map<string, t.Expression>([
    ['id', f.createStringLiteral(id)],
    ...generateChildExpressions(message.children),
  ]);

  const properties = [...children].map(([name, expression]) => {
    return f.createPropertyAssignment(f.createIdentifier(name), expression);
  });

  return f.createCallExpression(
    f.createPropertyAccessExpression(message.expression, 'call'),
    undefined,
    [f.createObjectLiteralExpression(properties)],
  );
}

export function generateJsxSayExpression(message: CompositeMessage) {
  const id = generateHash(generateIcuMessageFormat(message), message.context);
  const children = new Map<string, t.Expression>([
    ['id', f.createStringLiteral(id)],
    ...generateChildExpressions(message.children),
  ]);

  const properties = [...children].map(([name, expression]) => {
    if (!Number.isNaN(Number(name))) name = `_${name}`;
    if (t.isJsxElement(expression))
      expression = removeReactElementChildren(expression);

    return f.createJsxAttribute(
      f.createIdentifier(name),
      t.isJsxExpression(expression)
        ? expression
        : f.createJsxExpression(undefined, expression),
    );
  });

  return f.createJsxSelfClosingElement(
    message.expression as t.Identifier,
    undefined,
    f.createJsxAttributes(properties),
  );
}

//

function removeReactElementChildren(element: t.JsxElement) {
  return f.updateJsxElement(
    element,
    element.openingElement,
    [],
    element.closingElement,
  );
}

function* generateChildExpressions(
  children: Record<string, Message>,
): Generator<[string, t.Expression]> {
  for (const [, message] of Object.entries(children)) {
    switch (message.type) {
      case 'argument': {
        yield [message.identifier, message.expression];
        break;
      }

      case 'element': {
        yield [message.identifier, message.expression];
        yield* generateChildExpressions(message.children);
        break;
      }

      case 'choice': {
        yield [message.identifier, message.expression];
        yield* generateChildExpressions(message.children);
        break;
      }

      case 'composite': {
        yield* generateChildExpressions(message.children);
        break;
      }
    }
  }
}
