/**
 * KEEP IN SYNC:
 * - `packages/plugin-tsc/src/ast-transformers.ts`
 * - `packages/plugin-swc/src/ast_transformers.rs`
 */

import t, { factory as f } from 'typescript';

export function transformImportDeclaration(node: t.ImportDeclaration) {
  if (
    t.isStringLiteral(node.moduleSpecifier) &&
    node.moduleSpecifier.text.includes('sayable')
  ) {
    return transformMacroImportDeclaration(node);
  }

  return null;
}

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
