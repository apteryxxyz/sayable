import type { Comment } from '@babel/types';
import type { CompositeMessage } from './messages/types.js';

export class Context {
  foundMessages: CompositeMessage[] = [];
  identifierStore = new IdentifierStore();
  constructor(public readonly comments: Comment[] | null | undefined) {}
}

export class IdentifierStore {
  #current = 0;

  next() {
    const id = this.#current;
    this.#current += 1;
    return id.toString();
  }

  back() {
    this.#current -= 1;
  }

  reset() {
    this.#current = 0;
  }
}
