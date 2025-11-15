import type { PluginObj } from '@babel/core';
import { Context } from './core/context.js';
import { Visitor } from './core/visitor.js';

export default function (): PluginObj {
  return {
    name: 'sayable',
    visitor: new Visitor(new Context([])).toHandlers(),
  };
}
