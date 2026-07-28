import { describe, expect, it } from 'vitest';
import { assignSequenceIdentifiers } from './identifier.js';
import {
  ArgumentMessage,
  AUTO_INCREMENT_IDENTIFIER,
  ChoiceMessage,
  CompositeMessage,
  ElementMessage,
  LiteralMessage,
} from './index.js';

describe('assignSequenceIdentifiers', () => {
  it('numbers auto-increment arguments in order', () => {
    const message = new CompositeMessage(
      {},
      [],
      [],
      [
        new ArgumentMessage(AUTO_INCREMENT_IDENTIFIER, null),
        new LiteralMessage('x'),
        new ArgumentMessage(AUTO_INCREMENT_IDENTIFIER, null),
      ],
      null,
    );
    assignSequenceIdentifiers(message);
    expect((message.children[0] as ArgumentMessage).identifier).toBe('0');
    expect((message.children[2] as ArgumentMessage).identifier).toBe('1');
  });

  it('leaves explicit identifiers untouched', () => {
    const arg = new ArgumentMessage('named', null);
    assignSequenceIdentifiers(new CompositeMessage({}, [], [], [arg], null));
    expect(arg.identifier).toBe('named');
  });

  it('recurses into element children', () => {
    const inner = new ArgumentMessage(AUTO_INCREMENT_IDENTIFIER, null);
    const element = new ElementMessage(AUTO_INCREMENT_IDENTIFIER, [inner], null);
    assignSequenceIdentifiers(new CompositeMessage({}, [], [], [element], null));
    // Element gets 0, its child gets 1.
    expect(element.identifier).toBe('0');
    expect(inner.identifier).toBe('1');
  });

  it('numbers choice identifiers, branch identifiers and branch values', () => {
    const branchValue = new ArgumentMessage(AUTO_INCREMENT_IDENTIFIER, null);
    const choice = new ChoiceMessage(
      'select',
      AUTO_INCREMENT_IDENTIFIER,
      [{ identifier: AUTO_INCREMENT_IDENTIFIER, value: branchValue }],
      null,
    );
    assignSequenceIdentifiers(new CompositeMessage({}, [], [], [choice], null));
    expect(choice.identifier).toBe('0');
    expect(choice.branches[0]!.identifier).toBe('1');
    expect((branchValue as ArgumentMessage).identifier).toBe('2');
  });

  it('keeps explicit branch identifiers while numbering their values', () => {
    const value = new ArgumentMessage(AUTO_INCREMENT_IDENTIFIER, null);
    const choice = new ChoiceMessage('select', 'gender', [{ identifier: 'female', value }], null);
    assignSequenceIdentifiers(new CompositeMessage({}, [], [], [choice], null));
    expect(choice.branches[0]!.identifier).toBe('female');
    expect(value.identifier).toBe('0');
  });

  it('skips sequence numbers already taken by an explicit identifier', () => {
    const tagged = new ElementMessage('0', [], null);
    const auto = new ArgumentMessage(AUTO_INCREMENT_IDENTIFIER, null);
    assignSequenceIdentifiers(new CompositeMessage({}, [], [], [tagged, auto], null));
    expect(tagged.identifier).toBe('0');
    expect(auto.identifier).toBe('1');
  });

  it('throws when two elements share a tag', () => {
    const message = new CompositeMessage(
      {},
      [],
      [],
      [new ElementMessage('link', [], null), new ElementMessage('link', [], null)],
      null,
    );
    expect(() => assignSequenceIdentifiers(message)).toThrow(
      "Duplicate element tag 'link', give each element in a message its own tag",
    );
  });

  it('allows two arguments to share an identifier', () => {
    const message = new CompositeMessage(
      {},
      [],
      [],
      [new ArgumentMessage('total', null), new ArgumentMessage('total', null)],
      null,
    );
    expect(() => assignSequenceIdentifiers(message)).not.toThrow();
  });

  it('throws when an element tag collides with an argument', () => {
    const message = new CompositeMessage(
      {},
      [],
      [],
      [new ElementMessage('total', [], null), new ArgumentMessage('total', null)],
      null,
    );
    expect(() => assignSequenceIdentifiers(message)).toThrow(
      "Element tag 'total' collides with an argument of the same name",
    );
  });

  it('leaves a literal message unchanged', () => {
    const literal = new LiteralMessage('hi');
    expect(() => assignSequenceIdentifiers(literal)).not.toThrow();
  });
});
