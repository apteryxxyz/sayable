/**
 * KEEP IN SYNC:
 * - `packages/plugin-tsc/src/ast-parsers.ts`
 * - `packages/plugin-swc/src/ast_parsers.rs`
 */

import t, { factory as f } from 'typescript';
import type { ChoiceMessage, CompositeMessage } from './message-types.js';

//

export function parseTaggedTemplateExpression(
  node: t.TaggedTemplateExpression,
  identifierStore: IdentifierStore,
): CompositeMessage | null {
  if (isSayIdentifier(node.tag)) {
    // say`...` or say({...})`...`

    const segments = [];
    if ('text' in node.template) {
      segments.push(node.template);
    } else {
      segments.push(node.template.head);
      for (const span of node.template.templateSpans)
        segments.push(span.expression, span.literal);
    }

    const children: CompositeMessage['children'] = {};
    for (const [i, segment] of segments.entries()) {
      if (t.isTemplateLiteralToken(segment)) {
        children[i] = { type: 'literal', text: segment.text };
        continue;
      }

      if (t.isCallExpression(segment)) {
        const message = parseCallExpression(segment, identifierStore);
        if (message) {
          children[i] = message;
          continue;
        }
      }

      if (t.isTaggedTemplateExpression(segment)) {
        const message = parseTaggedTemplateExpression(segment, identifierStore);
        if (message) {
          children[i] = message;
          continue;
        }
      }

      if (t.isExpression(segment)) {
        children[i] = {
          type: 'argument',
          identifier: getPropertyName(segment, identifierStore),
          expression: segment,
        };
        continue;
      }

      void segment;
    }

    const expression = //
      t.isCallExpression(node.tag) ? node.tag.expression : node.tag;
    return {
      type: 'composite',
      expression,
      children,
      comments: getTranslatorComments(node),
      references: getNodeReferences(node),
      context:
        (t.isCallExpression(node.tag) &&
          getPropertyValue(node.tag.arguments[0]!, 'context')) ||
        undefined,
    };
  }

  return null;
}

export function parseCallExpression(
  node: t.CallExpression,
  identifierStore: IdentifierStore,
): CompositeMessage | null {
  if (
    // <object>.<property>(...)
    t.isPropertyAccessExpression(node.expression) &&
    // <object>.select() or <object>.plural() or <object>.ordinal()
    ['select', 'plural', 'ordinal'].includes(node.expression.name.text) &&
    isSayIdentifier(node.expression.expression) &&
    // arguments
    node.arguments.length === 2 &&
    t.isExpression(node.arguments[0]!) &&
    t.isObjectLiteralExpression(node.arguments[1]!)
  ) {
    // say.plural(_, {...}) or say({...}).plural(_, {...})

    const children: ChoiceMessage['children'] = {};
    for (const property of node.arguments[1]!.properties) {
      if (!t.isPropertyAssignment(property)) continue;
      const key = getPropertyName(property.name, identifierStore);

      if (
        t.isStringLiteral(property.initializer) ||
        t.isNumericLiteral(property.initializer) ||
        t.isNoSubstitutionTemplateLiteral(property.initializer)
      ) {
        children[key] = {
          type: 'literal',
          text: property.initializer.text,
        };
        continue;
      }

      if (t.isTemplateExpression(property.initializer)) {
        const fake = f.createTaggedTemplateExpression(
          f.createIdentifier('say'),
          undefined,
          property.initializer,
        );
        const message = parseTaggedTemplateExpression(fake, identifierStore); //
        if (message) Object.assign(children, message.children);
        continue;
      }

      if (t.isTaggedTemplateExpression(property.initializer)) {
        const message = //
          parseTaggedTemplateExpression(property.initializer, identifierStore);
        if (message) Object.assign(children, message.children);
        continue;
      }

      void property;
    }

    const property = node.expression.name;
    const value = node.arguments[0]!;
    const choice = {
      type: 'choice',
      kind: property.text as ChoiceMessage['kind'],
      identifier: t.isIdentifier(value) ? value.text : '_',
      expression: value,
      children,
    } satisfies ChoiceMessage;

    const expression = t.isCallExpression(node.expression.expression)
      ? node.expression.expression.expression
      : node.expression.expression;

    return {
      type: 'composite',
      expression,
      children: { 0: choice },
      comments: getTranslatorComments(node),
      references: getNodeReferences(node),
      context:
        (t.isCallExpression(node.expression.expression) &&
          getPropertyValue(
            node.expression.expression.arguments[0]!,
            'context',
          )) ||
        undefined,
    };
  }

  return null;
}

export function parseJsxElement(
  node: t.JsxElement,
  identifierStore: IdentifierStore,
): CompositeMessage | null {
  if (
    t.isIdentifier(node.openingElement.tagName) &&
    node.openingElement.tagName.text === 'Say'
  ) {
    // <Say>...</Say>

    const children: CompositeMessage['children'] = {};
    for (const [i, child] of node.children.entries()) {
      if (t.isJsxText(child)) {
        const text = child.text.replace(/\s+/g, ' ');
        children[i] = { type: 'literal', text };
        continue;
      }

      if (t.isJsxSelfClosingElement(child)) {
        const message = parseJsxSelfClosingElement(child, identifierStore);
        if (message) children[i] = message;
        continue;
      }

      if (t.isJsxElement(child) || t.isJsxFragment(child)) {
        const fake = t.factory.createJsxElement(
          t.factory.createJsxOpeningElement(
            t.factory.createIdentifier('Say'),
            undefined,
            t.factory.createJsxAttributes([]),
          ),
          child.children,
          t.factory.createJsxClosingElement(t.factory.createIdentifier('Say')),
        );
        const preloadedIdentifier = identifierStore.next();
        const message = parseJsxElement(fake, identifierStore);
        if (message)
          children[i] = {
            type: 'element',
            identifier: preloadedIdentifier,
            children: message.children,
            expression: child,
          };
        else identifierStore.back();
        continue;
      }

      if (t.isJsxExpression(child)) {
        children[i] = {
          type: 'argument',
          identifier: getPropertyName(child.expression!, identifierStore),
          expression: child.expression!,
        };
        continue;
      }

      void child;
    }

    return {
      type: 'composite',
      expression: node.openingElement.tagName,
      children,
      comments: getTranslatorComments(node),
      references: getNodeReferences(node),
      context: getPropertyValue(node.openingElement.attributes, 'context'),
    };
  }

  return null;
}

export function parseJsxSelfClosingElement(
  node: t.JsxSelfClosingElement,
  identifierStore: IdentifierStore,
): CompositeMessage | null {
  if (
    t.isPropertyAccessExpression(node.tagName) &&
    t.isIdentifier(node.tagName.expression) &&
    node.tagName.expression.text === 'Say' &&
    t.isIdentifier(node.tagName.name) &&
    ['Select', 'Plural', 'Ordinal'].includes(node.tagName.name.text)
  ) {
    // <Say.Select /> or <Say.Plural /> or <Say.Ordinal />

    const children: ChoiceMessage['children'] = {};
    for (const property of node.attributes.properties) {
      if (!t.isJsxAttribute(property) || !property.initializer) continue;
      const key = getPropertyName(property.name, identifierStore);
      if (key === '_' || key === 'context') continue;

      if (
        t.isStringLiteral(property.initializer) ||
        t.isNumericLiteral(property.initializer)
      ) {
        children[key] = {
          type: 'literal',
          text: String(property.initializer.text),
        };
        continue;
      }

      if (t.isJsxExpression(property.initializer)) {
        const fake = t.factory.createJsxElement(
          t.factory.createJsxOpeningElement(
            t.factory.createIdentifier('Say'),
            undefined,
            t.factory.createJsxAttributes([]),
          ),
          [property.initializer.expression as t.JsxChild],
          t.factory.createJsxClosingElement(t.factory.createIdentifier('Say')),
        );
        const message = parseJsxElement(fake, identifierStore);
        if (message) Object.assign(children, message.children);
        continue;
      }

      void property;
    }

    const value = node.attributes.properties //
      .find((p): p is t.JsxAttribute => p.name?.getText() === '_')!
      .initializer as t.JsxExpression;
    const identifier =
      ('expression' in value &&
        t.isIdentifier(value.expression!) &&
        value.expression?.getText()) ||
      '_';
    const choice = {
      type: 'choice',
      kind: node.tagName.name.text.toLowerCase() as ChoiceMessage['kind'],
      identifier: identifier,
      expression: value,
      children,
    } satisfies ChoiceMessage;

    return {
      type: 'composite',
      expression: node.tagName,
      children: { 0: choice },
      comments: getTranslatorComments(node),
      references: getNodeReferences(node),
      context: getPropertyValue(node.attributes, 'context'),
    };
  }

  return null;
}

//

function isSayIdentifier(
  node: t.LeftHandSideExpression,
): node is t.Identifier | t.PropertyAccessExpression | t.CallExpression {
  return (
    // say
    (t.isIdentifier(node) && node.text === 'say') ||
    // object.say
    (t.isPropertyAccessExpression(node) && isSayIdentifier(node.name)) ||
    // say().
    (t.isCallExpression(node) && isSayIdentifier(node.expression))
  );
}

type IdentifierStore = ReturnType<typeof createIdentifierStore>;
export function createIdentifierStore() {
  let current = 0;
  return {
    next: () => String(current++),
    back: () => void current--,
  };
}

function getPropertyName(node: t.Node, identifierStore: IdentifierStore) {
  if (t.isIdentifier(node)) {
    return node.text;
  } else if (t.isCallExpression(node)) {
    if (t.isPropertyAccessExpression(node.expression)) {
      return getPropertyName(node.expression.expression, identifierStore);
    } else {
      return getPropertyName(node.expression, identifierStore);
    }
  } else if (t.isPropertyAccessExpression(node)) {
    return getPropertyName(node.name, identifierStore);
  } else {
    return identifierStore.next();
  }
}

function getPropertyValue(node: t.Expression, key: string) {
  if (!t.isObjectLiteralExpression(node) && !t.isJsxAttributes(node))
    return undefined;

  for (const property of node.properties) {
    if (t.isJsxAttribute(property)) {
      if (property.name.getText() === key) return property.name.getText();
    } else if (t.isPropertyAssignment(property)) {
      if (property.name.getText() === key) return property.name.getText();
      if (t.isStringLiteral(property.initializer))
        return property.initializer.text;
    }
  }
  return undefined;
}

function getLeadingCommentsForNode(
  node: t.Node,
  sourceFile = node.getSourceFile(),
): string[] {
  if (!sourceFile) return [];

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

function getTranslatorComments(node: t.Node): string[] {
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
    : getTranslatorComments(node.parent);
}

function getNodeReferences(node: t.Node, sourceFile = node.getSourceFile()) {
  if (!sourceFile) return [];
  const filename = sourceFile.fileName;

  let relative =
    filename
      .slice(filename.indexOf(process.cwd()) + process.cwd().length + 1)
      .replaceAll('\\', '/') || filename;
  if (relative.startsWith('/')) relative = relative.slice(1);

  const position = node.getSourceFile().getLineAndCharacterOfPosition(node.pos);

  // position.line seems to be consistently off by one
  return [`${relative}:${position.line + 1}` as const];
}
