import t, { factory as f } from 'typescript';

export function transformImportDeclaration(node: t.ImportDeclaration) {
  if (
    t.isStringLiteral(node.moduleSpecifier) &&
    node.moduleSpecifier.text === 'sayable'
  ) {
    return transformMacroImportDeclaration(node);
  }

  return null;
}

export function transformMacroImportDeclaration(node: t.ImportDeclaration) {
  return f.updateImportDeclaration(
    node,
    node.modifiers,
    node.importClause,
    f.createStringLiteral('sayable/runtime'),
    node.attributes,
  );
}
