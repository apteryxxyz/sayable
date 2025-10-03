/**
 * KEEP IN SYNC:
 * - `packages/plugin-tsc/src/ast-generators.ts`
 * - `packages/plugin-swc/src/ast_generators.rs`
 */

import t, { factory as f } from 'typescript';
import { generateHash } from './generate-hash.js';
import { generateIcuMessageFormat } from './generate-icu-message-format.js';
import type { CompositeMessage, Message } from './message-types.js';

/**
 * Generates an expression for a runtime `say({ ... })` call.
 * Includes all interpolated children and a hashed message ID.
 *
 * @param message The composite message to turn into a call expression
 * @returns `CallExpression` node
 */
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
    f.createPropertyAccessExpression(message.accessor, 'call'),
    undefined,
    [f.createObjectLiteralExpression(properties)],
  );
}

/**
 * Generates a JSX self-closing element like `<Say.Plural />` with props.
 * Converts message children to JSX attributes, includes hashed ID.
 *
 * @param message The composite message to convert into JSX
 * @returns `JsxSelfClosingElement` node
 */
export function generateJsxSayExpression(message: CompositeMessage) {
  const id = generateHash(generateIcuMessageFormat(message), message.context);
  const children = new Map<string, t.Expression>([
    ['id', f.createStringLiteral(id)],
    ...generateChildExpressions(message.children),
  ]);

  const properties = [...children].map(([name, expression]) => {
    // If name is numeric, prefix with `_` since JSX props can't start with numbers
    if (!Number.isNaN(Number(name))) name = `_${name}`;

    // Strip children from any nested JSX elements to avoid redundant output
    // Related to element message type
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
    message.accessor as t.Identifier,
    undefined,
    f.createJsxAttributes(properties),
  );
}

//

/**
 * Strips children from a JSX element.
 * Used to prevent double-nesting when generating from `element` type messages.
 */
function removeReactElementChildren(element: t.JsxElement) {
  return f.updateJsxElement(
    element,
    element.openingElement,
    [],
    element.closingElement,
  );
}

/**
 * Recursively yields key-value pairs of expressions to be used in output AST.
 *
 * Handles nested message types like:
 * - arguments: basic identifiers or expressions
 * - elements: embedded JSX fragments
 * - choices: plural/select/ordinal forms
 * - composites: nested structures with children
 *
 * @param children A record of message parts (arguments, choices, etc.)
 * @yields Tuples of [identifier, expression] for each message child
 */
function* generateChildExpressions(
  children: Message[],
): Generator<[string, t.Expression]> {
  for (const message of children) {
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
        yield* generateChildExpressions(Object.values(message.branches));
        break;
      }

      case 'composite': {
        yield* generateChildExpressions(message.children);
        break;
      }
    }
  }
}
