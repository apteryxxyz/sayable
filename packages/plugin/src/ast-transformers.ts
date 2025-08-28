import t, { factory as f } from 'typescript';

export function transformImportDeclaration(node: t.ImportDeclaration) {
  if (
    t.isStringLiteral(node.moduleSpecifier) &&
    node.moduleSpecifier.text.startsWith('sayable')
  ) {
    return transformMacroImportDeclaration(node);
  }

  return null;
}

function transformMacroImportDeclaration(node: t.ImportDeclaration) {
  let specifier = (node.moduleSpecifier as t.StringLiteral).text;
  if (specifier === 'sayable') specifier = 'sayable/runtime';

  return f.updateImportDeclaration(
    node,
    node.modifiers,
    node.importClause,
    f.createStringLiteral(specifier),
    node.attributes,
  );
}
