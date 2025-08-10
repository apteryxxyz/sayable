/**
 * KEEP IN SYNC:
 * - `packages/plugin/src/ast-generator.ts`
 * - `packages/swc-plugin/src/ast_generator.rs`
 */

import type t from 'typescript';
import { factory as f } from 'typescript';
import { generateHash } from './generate-hash.js';
import { generateIcuMessageFormat } from './icu-generator.js';
import type { ChoiceMessage, CompositeMessage } from './message-types.js';

/**
 * Generates the `say` expression for a message.
 */
export function generateSayExpression(message: CompositeMessage) {
  const id = generateHash(generateIcuMessageFormat(message));
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

//

export function generatePrimitiveExportExpression(primitive: unknown) {
  return [
    f.createJSDocComment(`@type {${typeof primitive}}`),
    f.createExportDefault(
      f.createCallExpression(
        f.createPropertyAccessExpression(
          f.createIdentifier('JSON'),
          f.createIdentifier('parse'),
        ),
        [],
        [f.createStringLiteral(JSON.stringify(primitive))],
      ),
    ),
  ];
}

// /**
//  * Generates a primitive export expression, used for the compiler to export messages.
//  */
// export function generatePrimitiveExportExpression(
//   primitive: unknown,
//   format: string,
// ) {
//   return generateExportExpression(
//     f.createCallExpression(
//       f.createPropertyAccessExpression(
//         f.createIdentifier('JSON'),
//         f.createIdentifier('parse'),
//       ),
//       [],
//       [f.createStringLiteral(JSON.stringify(primitive))],
//     ),
//     format,
//   );
// }

// /**
//  * Generate an export expression for a given expression and format.
//  */
// function generateExportExpression(expression: t.Expression, format: string) {
//   if (format === 'ts') {
//     return f.createExportDefault(
//       f.createAsExpression(
//         expression,
//         f.createTypeReferenceNode('Record', [
//           f.createKeywordTypeNode(t.SyntaxKind.StringKeyword),
//           f.createKeywordTypeNode(t.SyntaxKind.StringKeyword),
//         ]),
//       ),
//     );
//   }

//   if (format === 'js') {
//     return f.createExportDefault(expression);
//   }

//   throw new Error(`Unknown format "${format}"`);
// }
