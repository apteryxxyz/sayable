import * as t from '@babel/types';
import {
  ArgumentMessage,
  AUTO_INCREMENT_IDENTIFIER,
  ChoiceMessage,
  CompositeMessage,
  ElementMessage,
  LiteralMessage,
  type Message,
} from '@saykit/config/features/messages';

/**
 * Attribute used to name the ICU tag an embedded element extracts as, e.g.
 * `<a say-tag="link">` becomes `<link></link>` rather than `<0></0>`. It never
 * reaches the real element.
 */
const TAG_ATTRIBUTE = 'say-tag';

// A tag name is also used as a JSX prop name.
const TAG_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function parseJSXContainerElement(element: t.JSXElement): CompositeMessage | null {
  if (element.openingElement.selfClosing) return null;
  const processed = processJSXOpeningElement(element.openingElement);
  if (!processed) return null;
  const [accessor] = processed;

  const children = element.children.reduce<Message[]>((p, c, i, a) => {
    if (t.isJSXText(c)) {
      let text = c.value.replace(/\s+/g, ' ');
      if (i === 0) text = text.trimStart();
      if (i === a.length - 1) text = text.trimEnd();
      if (text) p.push(new LiteralMessage(text));
    }

    if (t.isJSXElement(c)) {
      p.push(parseJSXElement(c, true));
    } else if (t.isJSXFragment(c)) {
      p.push(new ElementMessage(AUTO_INCREMENT_IDENTIFIER, [], c));
    } else if (t.isJSXExpressionContainer(c)) {
      if (t.isExpression(c.expression))
        p.push(new ArgumentMessage(getExpressionAsIdentifier(c.expression), c.expression));
    }

    return p;
  }, []);

  const descriptorId = findAttributeValueIfStringLiteralAsString(
    element.openingElement.attributes,
    'id',
  );
  const descriptorContext = findAttributeValueIfStringLiteralAsString(
    element.openingElement.attributes,
    'context',
  );
  const whitespace = findAttributeValueAsBoolean(element.openingElement.attributes, 'whitespace');

  return new CompositeMessage(
    { id: descriptorId, context: descriptorContext },
    [],
    getReferences(element),
    children,
    accessor as t.Expression,
    whitespace,
  );
}

export function parseJSXOpeningElement(element: t.JSXOpeningElement): CompositeMessage | null {
  if (!element.selfClosing) return null;
  const processed = processJSXOpeningElement(element);
  if (!processed) return null;
  const [accessor, kind] = processed;

  if (typeof kind === 'string' && ['select', 'ordinal', 'plural'].includes(kind)) {
    const branches = element.attributes.reduce<{ identifier: string; value: Message }[]>((b, a) => {
      if (!t.isJSXAttribute(a)) return b;

      let identifier = getAttributeNameAsString(a);
      if (identifier === '_' || identifier === 'id' || identifier === 'context') return b;
      if (
        identifier.startsWith('_') &&
        identifier.length > 1 &&
        !Number.isNaN(+identifier.slice(1))
      )
        identifier = identifier.slice(1);

      if (t.isStringLiteral(a.value)) {
        b.push({ identifier, value: new LiteralMessage(a.value.value) });
      } else if (t.isJSXExpressionContainer(a.value)) {
        if (t.isJSXElement(a.value.expression)) {
          b.push({
            identifier,
            value: parseJSXElement(a.value.expression, true),
          });
        } else if (t.isJSXFragment(a.value.expression)) {
          b.push({
            identifier,
            value: new ElementMessage(AUTO_INCREMENT_IDENTIFIER, [], a.value.expression),
          });
        } else if (t.isExpression(a.value.expression)) {
          b.push({
            identifier,
            value: new ArgumentMessage(
              getExpressionAsIdentifier(a.value.expression),
              a.value.expression,
            ),
          });
        }
      }

      return b;
    }, []);

    const initialiser = findAttributeValueIfExpressionOrStringLiteral(element.attributes, '_');
    if (!initialiser) return null;
    const identifier = getExpressionAsIdentifier(initialiser);
    const choice = new ChoiceMessage(kind, identifier, branches, initialiser);

    const descriptorId = findAttributeValueIfStringLiteralAsString(element.attributes, 'id');
    const descriptorContext = findAttributeValueIfStringLiteralAsString(
      element.attributes,
      'context',
    );

    return new CompositeMessage(
      { id: descriptorId, context: descriptorContext },
      [],
      getReferences(element),
      [choice],
      accessor as t.Expression,
    );
  }

  return null;
}

function processJSXOpeningElement(element: t.JSXOpeningElement): [t.Node, string | null] | null {
  if (t.isJSXIdentifier(element.name) && element.name.name === 'Say') {
    return [element.name, null];
  }

  if (
    t.isJSXMemberExpression(element.name) &&
    t.isJSXIdentifier(element.name.object) &&
    element.name.object.name === 'Say' &&
    t.isJSXIdentifier(element.name.property)
  ) {
    return [element.name.object, element.name.property.name.toLowerCase()];
  }

  return null;
}

export function parseJSXElement(element: t.JSXElement, fallback?: false): CompositeMessage | null;
export function parseJSXElement(
  element: t.JSXElement,
  fallback: true,
): CompositeMessage | ElementMessage;
export function parseJSXElement(element: t.JSXElement, fallback?: boolean): Message | null {
  const message = element.openingElement.selfClosing
    ? parseJSXOpeningElement(element.openingElement)
    : parseJSXContainerElement(element);

  if (message) return message;
  if (!fallback) return null;

  const identifier = takeElementTag(element) ?? AUTO_INCREMENT_IDENTIFIER;

  if (element.openingElement.selfClosing) return new ElementMessage(identifier, [], element);

  const fake = t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier('Say'), []),
    t.jsxClosingElement(t.jsxIdentifier('Say')),
    element.children,
  );
  // `parseJSXElement(fake, true)` always resolves (the synthesised element is a
  // `Say` container), so the wrapped message is never null.
  const wrapped = parseJSXElement(fake, true)!;
  return new ElementMessage(identifier, [wrapped], element);
}

/**
 * Read the tag name off an embedded element and remove the attribute so it
 * never reaches the rendered element. Only static strings name a tag; anything
 * else is left in place and the element falls back to an auto-incremented
 * identifier.
 */
function takeElementTag(element: t.JSXElement) {
  const attributes = element.openingElement.attributes;
  const index = attributes.findIndex(
    (a) => t.isJSXAttribute(a) && getAttributeNameAsString(a) === TAG_ATTRIBUTE,
  );
  if (index === -1) return undefined;

  const attribute = attributes[index] as t.JSXAttribute;
  // Both `say-tag="link"` and `say-tag={'link'}` are static; anything else is
  // only known at runtime, too late to name a tag with.
  const value = t.isJSXExpressionContainer(attribute.value)
    ? attribute.value.expression
    : attribute.value;
  if (!t.isStringLiteral(value)) return undefined;

  const tag = value.value;
  if (!TAG_PATTERN.test(tag))
    throw new Error(
      `Invalid '${TAG_ATTRIBUTE}' value '${tag}', expected a letter or underscore followed by letters, digits, or underscores`,
    );

  attributes.splice(index, 1);
  return tag;
}

/**
 * Whether two elements sharing a tag are the same element, and so compile to
 * one prop a translator can use interchangeably. `say-tag` has been stripped by
 * the time this runs, so it compares the element name and the props left over,
 * not the children: those come from the translation, not the source.
 */
export function isEquivalentElement(a: any, b: any) {
  if (!t.isJSXElement(a) || !t.isJSXElement(b)) return false;
  return t.isNodesEquivalent(a.openingElement, b.openingElement);
}

function getReferences(node: t.Node) {
  if (!node.loc?.filename) return [];
  return [`${node.loc.filename}:${node.loc.start.line}`];
}

function getAttributeNameAsString(attribute: t.JSXAttribute) {
  // A JSX attribute name is always an identifier or a namespaced name.
  return t.isJSXIdentifier(attribute.name) ? attribute.name.name : attribute.name.name.name;
}

function findAttributeValueIfStringLiteralAsString(
  attributes: (t.JSXAttribute | t.JSXSpreadAttribute)[],
  identifier: string,
) {
  for (const attribute of attributes) {
    if (!t.isJSXAttribute(attribute)) continue;
    if (t.isJSXIdentifier(attribute.name) && attribute.name.name === identifier) {
      if (t.isStringLiteral(attribute.value)) return attribute.value.value;
    }
  }
  return undefined;
}

function findAttributeValueIfExpressionOrStringLiteral(
  attributes: (t.JSXAttribute | t.JSXSpreadAttribute)[],
  identifier: string,
) {
  for (const attribute of attributes) {
    if (!t.isJSXAttribute(attribute)) continue;
    if (t.isJSXIdentifier(attribute.name) && attribute.name.name === identifier) {
      if (t.isJSXExpressionContainer(attribute.value) && t.isExpression(attribute.value.expression))
        return attribute.value.expression;
      if (t.isStringLiteral(attribute.value)) return attribute.value;
    }
  }
  return undefined;
}

function findAttributeValueAsBoolean(
  attributes: (t.JSXAttribute | t.JSXSpreadAttribute)[],
  identifier: string,
) {
  for (const attribute of attributes) {
    if (!t.isJSXAttribute(attribute)) continue;
    if (!t.isJSXIdentifier(attribute.name) || attribute.name.name !== identifier) continue;
    // Bare attribute (e.g. `whitespace`) implies `true`.
    if (attribute.value == null) return true;
    if (
      t.isJSXExpressionContainer(attribute.value) &&
      t.isBooleanLiteral(attribute.value.expression)
    )
      return attribute.value.expression.value;
  }
  return undefined;
}

function getExpressionAsIdentifier(node: t.Node) {
  if (t.isIdentifier(node)) return node.name;
  // Initialiser and argument nodes are always plain expressions here, never a
  // bare JSX identifier, so this branch is unreachable in practice.
  /* v8 ignore next */
  if (t.isJSXIdentifier(node)) return node.name;
  return AUTO_INCREMENT_IDENTIFIER;
}
