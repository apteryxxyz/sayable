/**
 * KEEP IN SYNC:
 * - `packages/plugin/src/ast-parser.ts`
 * - `packages/swc-plugin/src/ast_parser.rs`
 */

import t from 'typescript';
import type { ChoiceMessage, CompositeMessage } from './message-types.js';

/**
 * Parses a tagged template expression into a composite message.
 * @param node The tagged template expression to parse.
 * @param extra Extra information about the node.
 * @returns The parsed composite message, or `null` if the node is not a valid message.
 * @example say`<message>`
 * @example <object>.say`<message>`
 * @example say(<descriptor>)`<message>`
 */
export function parseTaggedTemplateExpression(
  node: t.TaggedTemplateExpression,
  extra: Extra,
): CompositeMessage | null {
  if (
    // identifier
    (isSayIdentifier(node.tag) ||
      (t.isCallExpression(node.tag) && isSayIdentifier(node.tag.expression))) &&
    // template
    (t.isTemplateExpression(node.template) ||
      t.isNoSubstitutionTemplateLiteral(node.template))
  ) {
    const segments = [];
    if ('text' in node.template) {
      segments.push(node.template);
    } else {
      segments.push(node.template.head);
      for (const s of node.template.templateSpans)
        segments.push(s.expression, s.literal);
    }

    const children: CompositeMessage['children'] = {};
    for (const [i, segment] of segments.entries()) {
      if (t.isTemplateLiteralToken(segment)) {
        children[i] = { type: 'literal', text: segment.text };
        continue;
      }

      if (t.isCallExpression(segment)) {
        extra.key = String(i);
        const message = parseCallExpression(segment, extra)?.children?.[0];
        if (message) children[String(i)] = message;
        continue;
      }

      const identifier = t.isIdentifier(segment)
        ? segment.getText()
        : String(i);
      children[String(i)] = {
        type: 'argument',
        identifier,
        expression: segment,
      };
    }

    const expression = t.isCallExpression(node.tag)
      ? node.tag.expression
      : node.tag;
    populateExtra(node.tag, extra);

    return {
      type: 'composite',
      expression,
      children,
      comments: extractTranslatorsComments(node),
      references: extractNodeReferences(node),
      context: extra.context,
    } satisfies CompositeMessage;
  }

  return null;
}

export function parseCallExpression(
  node: t.CallExpression,
  extra: Extra,
): CompositeMessage | null {
  if (
    // identifier
    t.isPropertyAccessExpression(node.expression) &&
    isSayIdentifier(node.expression.expression) &&
    // member
    ['select', 'plural', 'ordinal'].includes(node.expression.name.text) &&
    // arguments
    node.arguments.length === 2 &&
    t.isExpression(node.arguments[0]!) &&
    t.isObjectLiteralExpression(node.arguments[1]!)
  ) {
    const children: CompositeMessage['children'] = {};
    for (const property of node.arguments[1].properties) {
      if (!t.isPropertyAssignment(property)) continue;
      const key = getPropertyKey(property);

      if (
        t.isStringLiteral(property.initializer) ||
        t.isNumericLiteral(property.initializer) ||
        t.isNoSubstitutionTemplateLiteral(property.initializer)
      ) {
        children[key] = {
          type: 'literal',
          text: String(property.initializer.text),
        };
        continue;
      }

      if (t.isTemplateExpression(property.initializer)) {
        const fake = t.factory.createTaggedTemplateExpression(
          t.factory.createIdentifier('say'),
          undefined,
          property.initializer,
        );
        const message = //
          parseTaggedTemplateExpression(fake, extra);
        if (message) children[key] = message;
        continue;
      }

      if (t.isTaggedTemplateExpression(property.initializer)) {
        const message = //
          parseTaggedTemplateExpression(property.initializer, extra);
        if (message) children[key] = message;
      }
    }

    const property = node.expression.name;
    const value = node.arguments[0];
    const choice = {
      type: 'choice',
      kind: property.text as ChoiceMessage['kind'],
      identifier: t.isIdentifier(value) ? value.text : extra.key || '_',
      expression: node.arguments[0],
      children,
    } satisfies ChoiceMessage;

    const expression = t.isCallExpression(node.expression.expression)
      ? node.expression.expression.expression
      : node.expression.expression;
    populateExtra(node.expression.expression, extra);

    return {
      type: 'composite',
      expression: expression,
      children: { 0: choice },
      comments: extractTranslatorsComments(node),
      references: extractNodeReferences(node),
      context: extra.context,
    } satisfies CompositeMessage;
  }

  return null;
}

//

interface Extra {
  context?: string;
  key?: string;
}

function populateExtra(node: t.Node, extra: Extra) {
  if (
    t.isCallExpression(node) &&
    t.isObjectLiteralExpression(node.arguments[0]!)
  ) {
    for (const property of node.arguments[0].properties) {
      if (!t.isPropertyAssignment(property)) continue;
      const key = getPropertyKey(property);

      if (t.isStringLiteral(property.initializer)) {
        if (key === 'context') extra.context = property.initializer.text;
      }
    }
  }
}

function isSayIdentifier(
  node: t.LeftHandSideExpression,
): node is t.Identifier | t.PropertyAccessExpression | t.CallExpression {
  return (
    // say
    (t.isIdentifier(node) && node.text === 'say') ||
    // object.say
    (t.isPropertyAccessExpression(node) && isSayIdentifier(node.expression)) ||
    // say()
    (t.isCallExpression(node) && isSayIdentifier(node.expression))
  );
}

function getPropertyKey(node: t.PropertyAssignment) {
  if (t.isIdentifier(node.name)) return node.name.text;
  if (t.isStringLiteral(node.name)) return node.name.text;
  if (t.isNumericLiteral(node.name)) return node.name.text;
  return node.name.getText();
}

function getLeadingCommentsForNode(
  node: t.Node,
  sourceFile: t.SourceFile = node.getSourceFile(),
): string[] {
  const commentRanges = t.getLeadingCommentRanges(
    sourceFile.getFullText(),
    node.getFullStart(),
  );

  if (commentRanges)
    return commentRanges.map((r) =>
      sourceFile.getFullText().slice(r.pos, r.end),
    );
  return [];
}

function getLeadingCommentsForJsxNode(node: t.JsxExpression) {
  // The first getChildren returns a sort of tuple, like [<h1>, [...children], </h1>]
  const siblings = node.parent.getChildren()[1]?.getChildren();

  // HACK: The actual previous sibling is typically just JsxText with a newline
  const prevSibling = siblings?.[siblings.indexOf(node) - 2];
  if (!prevSibling) return [];

  const prevText = prevSibling.getText();
  const match = prevText.match(/^\{\s*\/\*([\s\S]*?)\*\/\s*\}$/);
  return match ? [`// ${match[1]!.trim()}`] : [];
}

/**
 * Extracts translator comments from the node text.
 */
function extractTranslatorsComments(node: t.Node): string[] {
  if (!node || t.isBlock(node) || t.isFunctionDeclaration(node)) return [];

  const leadingComments = t.isJsxExpression(node)
    ? getLeadingCommentsForJsxNode(node)
    : getLeadingCommentsForNode(node);

  const translatorComments = leadingComments.reduce((comments, c) => {
    const match = c.match(/TRANSLATORS:\s*((?:(?!\*\/).)*)/);
    if (match) comments.push(match[1]!);
    return comments;
  }, [] as string[]);

  return translatorComments.length
    ? translatorComments
    : extractTranslatorsComments(node.parent);
}

/**
 * Extract the node reference, aka the node location within the project.
 */
function extractNodeReferences(node: t.Node) {
  if (typeof process === 'undefined') return undefined;

  const filename = node.getSourceFile().fileName;

  let relative = filename
    .slice(filename.indexOf(process.cwd()) + process.cwd().length + 1)
    .replaceAll('\\', '/');
  if (relative.startsWith('/')) relative = relative.slice(1);

  const position = node
    .getSourceFile()
    .getLineAndCharacterOfPosition(node.getStart());

  return [`${relative}:${position.line}:${position.character}` as const];
}
