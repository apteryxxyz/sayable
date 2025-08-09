import t from 'typescript';
import type { ChoiceMessage, CompositeMessage } from './message-types.js';

/**
 * Parses a tagged template expression into a composite message.
 * @example say`Hello ${name}!`
 * @example object.say`Hello ${name}!`
 */
export function parseTaggedTemplateExpression(
  node: t.TaggedTemplateExpression,
  extra: Partial<object> = {},
): CompositeMessage | null {
  if (
    // say`...` & <object>.say`...`
    node.tag.getText()?.split('.').at(-1) === 'say' &&
    (t.isTemplateExpression(node.template) ||
      t.isNoSubstitutionTemplateLiteral(node.template))
  ) {
    const segments =
      'text' in node.template
        ? [node.template]
        : [
            node.template.head,
            ...node.template.templateSpans //
              .flatMap((s) => [s.expression, s.literal]),
          ];

    const children: CompositeMessage['children'] = {};
    for (const [i, segment] of segments.entries()) {
      if (t.isTemplateLiteralToken(segment)) {
        children[i] = {
          type: 'literal',
          text: segment.text,
        };
        continue;
      }

      if (t.isCallExpression(segment)) {
        const message = parseCallExpression(segment, {
          ...extra,
          key: String(i),
        })?.children?.[0];
        if (message) children[String(i)] = message;
        continue;
      }

      children[String(i)] = {
        type: 'argument',
        identifier: t.isIdentifier(segment) ? segment.getText() : String(i),
        expression: segment,
      };
    }

    return {
      type: 'composite',
      expression: node.tag,
      children,
      comments: extractTranslatorsComments(node),
      references: extractNodeReferences(node),
    };
  }

  return null;
}

/**
 * Parses a call expression into a composite message.
 * @example say.select(gender, { male: 'He', female: 'She', other: 'They' })
 * @example object.say.select(gender, { male: 'He', female: 'She', other: 'They' })
 */
export function parseCallExpression(
  node: t.CallExpression,
  extra: Partial<{ key: string }> = {},
): CompositeMessage | null {
  if (
    t.isPropertyAccessExpression(node.expression) &&
    t.isIdentifier(node.expression.name) &&
    ['select', 'plural', 'ordinal'].includes(node.expression.name.text) &&
    node.arguments.length === 2 &&
    t.isExpression(node.arguments[0]!) &&
    t.isObjectLiteralExpression(node.arguments[1]!)
  ) {
    const children: CompositeMessage['children'] = {};

    for (const property of node.arguments[1].properties) {
      if (!t.isPropertyAssignment(property)) continue;

      let key: string | number;
      if (t.isIdentifier(property.name)) key = property.name.text;
      else if (t.isStringLiteral(property.name)) key = property.name.text;
      else if (t.isNumericLiteral(property.name)) key = property.name.text;
      else continue;

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
        const message = parseTaggedTemplateExpression(fake);
        if (message) children[key] = message;
        continue;
      }

      if (t.isTaggedTemplateExpression(property.initializer)) {
        const message = parseTaggedTemplateExpression(property.initializer);
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

    return {
      type: 'composite',
      expression: node.expression.expression,
      children: { 0: choice },
      comments: extractTranslatorsComments(node),
      references: extractNodeReferences(node),
    };
  }

  return null;
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
