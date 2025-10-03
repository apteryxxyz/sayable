/**
 * KEEP IN SYNC:
 * - `packages/plugin-tsc/src/ast-transformers.ts`
 * - `packages/plugin-swc/src/ast_transformers.rs`
 */

import t, { factory as f } from 'typescript';

/**
 * Transforms imports from `sayable` or `@sayable/react` into their runtime equivalents.
 *
 * Only matches imports where the module specifier includes `"sayable"`.
 *
 * @param node The original import declaration node
 * @returns A transformed import declaration, or null if not matched
 */
export function transformImportDeclaration(node: t.ImportDeclaration) {
  if (
    t.isStringLiteral(node.moduleSpecifier) &&
    node.moduleSpecifier.text.includes('sayable')
  ) {
    return transformMacroImportDeclaration(node);
  }

  return null;
}

/**
 * Rewrites `sayable` and `@sayable/react` imports to their `/runtime` equivalents.
 *
 * @param node The import declaration node to transform
 * @returns A new import declaration node with updated module specifier
 */
function transformMacroImportDeclaration(node: t.ImportDeclaration) {
  let specifier = (node.moduleSpecifier as t.StringLiteral).text;
  if (specifier === 'sayable') specifier = 'sayable/runtime';
  if (specifier === '@sayable/react') specifier = '@sayable/react/runtime';

  return f.updateImportDeclaration(
    node,
    node.modifiers,
    node.importClause,
    f.createStringLiteral(specifier),
    node.attributes,
  );
}
