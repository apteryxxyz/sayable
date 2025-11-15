import type { Visitor as BabelVisitor } from '@babel/core';
import { generateSayCallExpression } from '~/features/js/generator.js';
import { parseExpression } from '~/features/js/parser.js';
import { generateSayJSXElement } from '~/features/jsx/generator.js';
import { parseJSXElement } from '~/features/jsx/parser.js';
import type { Context } from './context.js';

// @ts-expect-error
type P<T extends keyof BabelVisitor> = Parameters<BabelVisitor[T]>[0];

export class Visitor {
  constructor(public readonly context: Context) {}

  Expression(path: P<'Expression'>) {
    path.node.leadingComments = path.parent.leadingComments;
    const message = parseExpression(this.context, path.node);

    if (message) {
      this.context.foundMessages.push(message);
      this.context.identifierStore.reset();

      const replacement = generateSayCallExpression(message);
      path.replaceWith(replacement);
      path.skip();
    }
  }

  JSXElement(path: P<'JSXElement'>) {
    const message = parseJSXElement(this.context, path.node);

    if (message) {
      this.context.foundMessages.push(message);
      this.context.identifierStore.reset();

      const replacement = generateSayJSXElement(message);
      path.replaceWith(replacement);
      path.skip();
    }
  }

  toHandlers() {
    return {
      Expression: this.Expression.bind(this),
      JSXElement: this.JSXElement.bind(this),
    };
  }
}
