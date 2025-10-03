import t from 'typescript';
import {
  generateJsxSayExpression,
  generateSayExpression,
} from './ast-generators.js';
import {
  createIdentifierStore,
  parseCallExpression,
  parseJsxElement,
  parseJsxSelfClosingElement,
  parseTaggedTemplateExpression,
} from './ast-parsers.js';
import { transformImportDeclaration } from './ast-transformers.js';
import type { CompositeMessage } from './message-types.js';

// ===== Visitor ===== //

export function createVisitor(onMessage?: (message: CompositeMessage) => void) {
  return ((context) => {
    return (file: t.SourceFile) => {
      const visitor: t.Visitor = (node) => {
        if (t.isImportDeclaration(node)) {
          const replacement = transformImportDeclaration(node);
          if (replacement) return replacement;
          return node;
        }

        const identifierStore = createIdentifierStore();

        if (t.isTaggedTemplateExpression(node)) {
          const result = parseTaggedTemplateExpression(node, identifierStore);
          if (result) {
            if (onMessage) onMessage(result);
            return generateSayExpression(result);
          }
        }

        if (t.isCallExpression(node)) {
          const result = parseCallExpression(node, identifierStore);
          if (result) {
            if (onMessage) onMessage(result);
            return generateSayExpression(result);
          }
        }

        if (t.isJsxElement(node)) {
          const result = parseJsxElement(node, identifierStore);
          if (result) {
            if (onMessage) onMessage(result);
            return generateJsxSayExpression(result);
          }
        }

        if (t.isJsxSelfClosingElement(node)) {
          const result = parseJsxSelfClosingElement(node, identifierStore);
          if (result) {
            if (onMessage) onMessage(result);
            return generateJsxSayExpression(result);
          }
        }

        return t.visitEachChild(node, visitor, context);
      };

      return t.visitNode(file, visitor) as typeof file;
    };
  }) satisfies t.TransformerFactory<t.SourceFile>;
}

// ===== Transformer ===== //

export function createTransformer() {
  return {
    transform(module: { code: string; id: string }) {
      const file = t.createSourceFile(
        module.id,
        module.code,
        { languageVersion: t.ScriptTarget.Latest },
        true,
      );

      const result = t.transform(file, [createVisitor()]);

      return t.createPrinter().printFile(result.transformed[0]!);
    },
  };
}

// ===== Extractor ===== //

export function createExtractor() {
  return {
    extract(module: { code: string; id: string }) {
      const file = t.createSourceFile(
        module.id,
        module.code,
        { languageVersion: t.ScriptTarget.Latest },
        true,
      );

      const messages: CompositeMessage[] = [];
      t.transform(file, [createVisitor((message) => messages.push(message))]);
      return messages;
    },
  };
}

export * from './ast-generators.js';
export * from './ast-parsers.js';
export * from './ast-transformers.js';
export * from './generate-hash.js';
export * from './generate-icu-message-format.js';
export * from './message-types.js';

export default () => createVisitor();
