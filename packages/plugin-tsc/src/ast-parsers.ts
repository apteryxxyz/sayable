/**
 * KEEP IN SYNC:
 * - `packages/plugin-tsc/src/ast-parsers.ts`
 * - `packages/plugin-swc/src/ast_parsers.rs`
 */

import t from 'typescript';
import type { ChoiceMessage, CompositeMessage } from './message-types.js';

//

/**
 * Parse a tagged template expression into maybe a composite message.
 *
 * @param node Tagged template expression node
 * @param identifierStore The store to track generated identifiers
 * @returns Composite message or null
 */
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

    const children: CompositeMessage['children'] = [];
    for (const segment of segments) {
      // Seems the world in "say`hello ${`world`}`" gets parsed as a template
      // literal, rather than a basic expression, will investigate another time
      if (t.isTemplateLiteralToken(segment)) {
        children.push({ type: 'literal', text: segment.text });
        continue;
      }

      if (t.isCallExpression(segment)) {
        const message = parseCallExpression(segment, identifierStore);
        if (message) {
          children.push(message);
          continue;
        }
      }

      if (t.isTaggedTemplateExpression(segment)) {
        const message = parseTaggedTemplateExpression(segment, identifierStore);
        if (message) {
          children.push(message);
          continue;
        }
      }

      children.push({
        type: 'argument',
        identifier: getPropertyName(segment, identifierStore),
        expression: segment,
      });
    }

    const accessor = t.isCallExpression(node.tag)
      ? node.tag.expression
      : node.tag;
    const descriptor = t.isCallExpression(node.tag)
      ? node.tag.arguments[0]!
      : undefined;
    const context = descriptor
      ? findPropertyValue(descriptor, 'context')
      : undefined;

    return {
      type: 'composite',
      accessor: accessor,
      children: children,
      comments: getTranslatorComments(node),
      references: getNodeReferences(node),
      context: context && ifStringAsString(context),
    };
  }

  return null;
}

/**
 * Parse a call expression into a choice message wrapped in a composite message.
 *
 * @param node Call expression node
 * @param identifierStore The store to track generated identifiers
 * @returns Composite message with a single choice message child or null
 */
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

    const branches: ChoiceMessage['branches'] = {};
    for (const property of node.arguments[1]!.properties) {
      if (!t.isPropertyAssignment(property)) continue;
      const key = getPropertyName(property.name, identifierStore);

      if (
        t.isStringLiteral(property.initializer) ||
        t.isNumericLiteral(property.initializer)
      ) {
        const text = property.initializer.text;
        branches[key] = { type: 'literal', text: text };
        continue;
      }

      if (t.isTaggedTemplateExpression(property.initializer)) {
        const message = //
          parseTaggedTemplateExpression(property.initializer, identifierStore);
        if (message) {
          branches[key] = message;
          continue;
        }
      }

      branches[key] = {
        type: 'argument',
        identifier: getPropertyName(property.initializer, identifierStore),
        expression: property.initializer,
      };
    }

    const property = node.expression.name;
    const value = node.arguments[0]!;

    const choice = {
      type: 'choice',
      kind: property.text as ChoiceMessage['kind'],
      identifier: t.isIdentifier(value) ? value.text : identifierStore.next(),
      expression: value,
      branches: branches,
    } satisfies ChoiceMessage;

    const accessor = t.isCallExpression(node.expression.expression)
      ? node.expression.expression.expression
      : node.expression.expression;

    return {
      type: 'composite',
      accessor: accessor,
      children: [choice],
      comments: getTranslatorComments(node),
      references: getNodeReferences(node),
      context: undefined,
    };
  }

  return null;
}

/**
 * Parse a JSX element into a composite message.
 *
 * @param node JSX element node
 * @param identifierStore The store to track generated identifiers
 * @returns Composite message or null
 */
export function parseJsxElement(
  node: t.JsxElement,
  identifierStore: IdentifierStore,
): CompositeMessage | null {
  if (
    t.isIdentifier(node.openingElement.tagName) &&
    node.openingElement.tagName.text === 'Say'
  ) {
    // <Say>...</Say>

    const children: CompositeMessage['children'] = [];
    for (const child of node.children) {
      if (t.isJsxText(child)) {
        const text = child.text.replace(/\s+/g, ' ');
        children.push({ type: 'literal', text: text });
        continue;
      }

      if (t.isJsxSelfClosingElement(child)) {
        // <Say.Select />
        const message = parseJsxSelfClosingElement(child, identifierStore);
        if (message) {
          children.push(message);
          continue;
        }
      }

      if (t.isJsxSelfClosingElement(child)) {
        // <br />
        children.push({
          type: 'element',
          identifier: identifierStore.next(),
          children: [],
          expression: child,
        });
        continue;
      }

      if (t.isJsxElement(child)) {
        // <Say>...</Say>
        const message = parseJsxElement(child, identifierStore);
        if (message) {
          children.push(message);
          continue;
        }
      }

      if (t.isJsxElement(child) || t.isJsxFragment(child)) {
        // <span>...</span> or <>...</>

        const tag = t.factory.createIdentifier('Say');
        const fake = t.factory.createJsxElement(
          t.factory.createJsxOpeningElement(
            tag,
            undefined,
            t.factory.createJsxAttributes([]),
          ),
          child.children,
          t.factory.createJsxClosingElement(tag),
        );

        // Preload the identifier to prevent out of order ids if
        // `parseJsxElement` requests ids
        const preloadedIdentifier = identifierStore.next();
        const message = parseJsxElement(fake, identifierStore);
        if (message) {
          children.push({
            type: 'element',
            identifier: preloadedIdentifier,
            expression: child,
            children: message.children,
          });
          continue;
        } else {
          // If the element is not valid, we need to backtrack the identifier
          identifierStore.back();
        }
      }

      if (t.isJsxExpression(child)) {
        children.push({
          type: 'argument',
          identifier: getPropertyName(child.expression!, identifierStore),
          expression: child.expression!,
        });
        continue;
      }

      void child;
    }

    const accessor = node.openingElement.tagName;
    const descriptor = node.openingElement.attributes;
    const context = findPropertyValue(descriptor, 'context');

    return {
      type: 'composite',
      accessor: accessor,
      children: children,
      comments: getTranslatorComments(node),
      references: getNodeReferences(node),
      context: context && ifStringAsString(context),
    };
  }

  return null;
}

/**
 * Parse a JSX self-closing element into a choice message wrapped in a composite message.
 *
 * @param node JSX self-closing element node
 * @param identifierStore The store to track generated identifiers
 * @returns Composite message with a single choice message child or null
 */
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

    const branches: ChoiceMessage['branches'] = {};
    for (const property of node.attributes.properties) {
      if (!t.isJsxAttribute(property) || !property.initializer) continue;

      let key = getPropertyName(property.name, identifierStore);
      if (key === '_' || key === 'context') continue;

      if (key.match(/^_\d+$/)) key = key.slice(1);

      if (
        t.isStringLiteral(property.initializer) ||
        t.isNumericLiteral(property.initializer)
      ) {
        const text = String(property.initializer.text);
        branches[key] = { type: 'literal', text: text };
        continue;
      }

      if (t.isJsxExpression(property.initializer)) {
        const fake = t.factory.createJsxElement(
          t.factory.createJsxOpeningElement(
            t.factory.createIdentifier('Say'),
            undefined,
            t.factory.createJsxAttributes([]),
          ),
          [property.initializer.expression as never],
          t.factory.createJsxClosingElement(t.factory.createIdentifier('Say')),
        );

        const message = parseJsxElement(fake, identifierStore);
        if (message) {
          branches[key] = message;
          continue;
        }
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
      identifierStore.next();

    const choice = {
      type: 'choice',
      kind: node.tagName.name.text.toLowerCase() as ChoiceMessage['kind'],
      identifier: identifier,
      expression: value,
      branches: branches,
    } satisfies ChoiceMessage;

    return {
      type: 'composite',
      accessor: node.tagName.expression,
      children: [choice],
      comments: getTranslatorComments(node),
      references: getNodeReferences(node),
      context: undefined,
    };
  }

  return null;
}

//

/**
 * Check if an expression is a valid `say` identifier.
 *
 * @param node Expression node to check
 * @returns `true` if the expression is a valid `say` identifier
 */
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

/**
 * Get the "name" of a node, used as the identifier for a message.
 *
 * @param node Node to get the name of
 * @param identifierStore The store to track generated identifiers, fallback
 * if no name could be determined
 * @returns The "name" of the node
 */
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

/**
 * Get the value of a property with the given key.
 *
 * @param node Object literal or JSX attributes
 * @param key Property key
 * @returns Property value expression, if found
 */
function findPropertyValue(node: t.Expression, key: string) {
  if (!t.isObjectLiteralExpression(node) && !t.isJsxAttributes(node))
    return undefined;

  for (const property of node.properties) {
    if (t.isJsxAttribute(property)) {
      if (property.name.getText() === key) return property.initializer;
    } else if (t.isPropertyAssignment(property)) {
      if (property.name.getText() === key) return property.initializer;
      if (t.isStringLiteral(property.initializer)) return property.initializer;
    }
  }
  return undefined;
}

/**
 * If the given node can be converted to a string, return it.
 *
 * @param node Expression node
 * @returns String value, if found
 */
function ifStringAsString(node: t.Expression) {
  if (t.isStringLiteral(node)) return node.text;
  if (t.isNumericLiteral(node)) return node.text;
  return undefined;
}

/**
 * Get the leading comments for a node.
 *
 * @param node Node to get comments for
 * @param sourceFile Source file to get comments from
 * @returns Array of leading comments
 */
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

/**
 * Get the leading comments for a JSX node.
 *
 * @param node JSX node to get comments for
 * @returns Array of leading comments
 */
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
 * Get the TRANSLATORS: comments for a node.
 *
 * @example
 * // TRANSLATORS: Greeting
 * say`Hello, {name}!`
 *
 * @param node Node to get comments for
 * @returns Array of translator comments
 */
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

/**
 * Get the references (file path and line number) for a node.
 *
 * @param node Node to get references for
 * @param sourceFile Source file, for the file path
 * @returns Array of references
 */
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
