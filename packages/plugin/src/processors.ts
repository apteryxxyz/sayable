import t from 'typescript';
import { generateSayExpression } from './ast-generators.js';
import {
  parseCallExpression,
  parseTaggedTemplateExpression,
} from './ast-parsers.js';
import { transformImportDeclaration } from './ast-transformers.js';
import { generateHash } from './generate-hash.js';
import { generateIcuMessageFormat } from './icu-generator.js';
import type { CompositeMessage } from './message-types.js';

// ===== Visitor ===== //

export function createVisitor(onMessage?: (message: CompositeMessage) => void) {
  return ((context) => {
    return (file: t.SourceFile) => {
      const visitor: t.Visitor = (node) => {
        if (t.isImportDeclaration(node)) {
          const replacement = transformImportDeclaration(node);
          if (replacement) return replacement;
        }

        if (t.isTaggedTemplateExpression(node)) {
          const result = parseTaggedTemplateExpression(node);
          if (result) {
            if (onMessage) onMessage(result);
            return generateSayExpression(result);
          }
        }

        if (t.isCallExpression(node)) {
          const result = parseCallExpression(node);
          if (result) {
            if (onMessage) onMessage(result);
            return generateSayExpression(result);
          }
        }

        return t.visitEachChild(node, visitor, context);
      };

      return t.visitNode(file, visitor) as typeof file;
    };
  }) satisfies t.TransformerFactory<t.SourceFile>;
}

// ===== Transformer ===== //

// TODO: Determine a way to avoid duplicating these types
interface Transformer {
  transform(module: { code: string; id: string }): string;
}

export function createTransformer() {
  return {
    transform(module) {
      const file = t.createSourceFile(
        module.id,
        module.code,
        { languageVersion: t.ScriptTarget.Latest },
        true,
      );

      const result = t.transform(file, [createVisitor()]);

      return t.createPrinter().printFile(result.transformed[0]!);
    },
  } satisfies Transformer;
}

// ===== Extractor ===== //

// TODO: Determine a way to avoid duplicating these types
interface Extractor {
  extract(module: {
    code: string;
    id: string;
  }): Record<string, CompositeMessage>;
}

export function createExtractor() {
  return {
    extract(module) {
      const file = t.createSourceFile(
        module.id,
        module.code,
        { languageVersion: t.ScriptTarget.Latest },
        true,
      );

      const messages = new Map<string, CompositeMessage>();
      t.transform(file, [
        createVisitor((message) => {
          const hash = generateHash(generateIcuMessageFormat(message));
          const existing = messages?.get(hash);
          if (existing) {
            (existing.comments ??= []).push(...(message.comments ?? []));
            (existing.references ??= []).push(...(message.references ?? []));
          } else {
            messages?.set(hash, message);
          }
        }),
      ]);

      return Object.fromEntries(messages);
    },
  } satisfies Extractor;
}
