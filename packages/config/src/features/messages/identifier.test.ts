import { describe, expect, it } from 'vitest';
import {
  assignSequenceIdentifiers,
  getBranchCase,
  validateBranchIdentifier,
} from './identifier.js';
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
      "Duplicate element tag 'link', give each element in a message its own tag unless they are identical",
    );
  });

  it('allows two elements to share a tag when they are equivalent', () => {
    const message = new CompositeMessage(
      {},
      [],
      [],
      [new ElementMessage('link', [], 'a'), new ElementMessage('link', [], 'a')],
      null,
    );
    expect(() =>
      assignSequenceIdentifiers(message, { current: 0 }, (a, b) => a === b),
    ).not.toThrow();
  });

  it('throws when elements sharing a tag are not equivalent', () => {
    const message = new CompositeMessage(
      {},
      [],
      [],
      [new ElementMessage('link', [], 'a'), new ElementMessage('link', [], 'b')],
      null,
    );
    expect(() => assignSequenceIdentifiers(message, { current: 0 }, (a, b) => a === b)).toThrow(
      "Duplicate element tag 'link'",
    );
  });

  it('allows two arguments to share a name when they are equivalent', () => {
    const message = new CompositeMessage(
      {},
      [],
      [],
      [new ArgumentMessage('total', 'sum'), new ArgumentMessage('total', 'sum')],
      null,
    );
    expect(() =>
      assignSequenceIdentifiers(message, { current: 0 }, (a, b) => a === b),
    ).not.toThrow();
  });

  it('throws when arguments sharing a name are not equivalent', () => {
    const message = new CompositeMessage(
      {},
      [],
      [],
      [new ArgumentMessage('total', 'sum'), new ArgumentMessage('total', 'other')],
      null,
    );
    expect(() => assignSequenceIdentifiers(message, { current: 0 }, (a, b) => a === b)).toThrow(
      "Duplicate placeholder name 'total', give each value in a message its own name unless they are identical",
    );
  });

  it('compares a choice against an argument of the same name', () => {
    const choice = new ChoiceMessage('plural', 'count', [], 'n');
    const message = new CompositeMessage(
      {},
      [],
      [],
      [choice, new ArgumentMessage('count', 'other')],
      null,
    );
    expect(() => assignSequenceIdentifiers(message, { current: 0 }, (a, b) => a === b)).toThrow(
      "Duplicate placeholder name 'count'",
    );
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

describe('getBranchCase', () => {
  it('writes a key as itself', () => {
    expect(getBranchCase('plural', 'other')).toBe('other');
  });

  it('writes a number as an exact value', () => {
    expect(getBranchCase('plural', '0')).toBe('=0');
    expect(getBranchCase('ordinal', '1')).toBe('=1');
  });

  // `select` has no exact-value syntax: its cases are literal string matches,
  // and `=0` there fails to parse. A bare `0` matches both `0` and `'0'`.
  it('leaves a number bare on a select', () => {
    expect(getBranchCase('select', '0')).toBe('0');
    expect(getBranchCase('select', 'other')).toBe('other');
  });

  // Everything JavaScript is willing to call a number is not one, and coercing
  // these would hand back a case that selects zero.
  it.each(['', ' ', '+0', '1e3'])('leaves %o a key rather than an exact value', (key) => {
    expect(getBranchCase('plural', key)).toBe(key);
  });
});

describe('validateBranchIdentifier', () => {
  it('accepts a plain key', () => {
    expect(() => validateBranchIdentifier('select', 'inStock')).not.toThrow();
  });

  it('accepts a key outside ASCII', () => {
    expect(() => validateBranchIdentifier('select', 'año')).not.toThrow();
  });

  it('accepts an exact value on a plural', () => {
    expect(() => validateBranchIdentifier('plural', '0')).not.toThrow();
  });

  it('accepts a branch still awaiting a sequence number', () => {
    expect(() => validateBranchIdentifier('select', AUTO_INCREMENT_IDENTIFIER)).not.toThrow();
  });

  it('rejects a hyphenated key and suggests a camel case one', () => {
    expect(() => validateBranchIdentifier('select', 'sold-out')).toThrow(
      "Invalid select branch key 'sold-out', an ICU key cannot contain punctuation or whitespace, try 'soldOut'",
    );
  });

  it('names the kind that was written', () => {
    expect(() => validateBranchIdentifier('ordinal', 'runner up')).toThrow(
      "Invalid ordinal branch key 'runner up'",
    );
  });

  it('omits the suggestion when nothing identifier-safe is left', () => {
    expect(() => validateBranchIdentifier('select', '--')).toThrow(
      "Invalid select branch key '--', an ICU key cannot contain punctuation or whitespace",
    );
    expect(() => validateBranchIdentifier('select', '--')).not.toThrow(/try/);
  });

  it('omits a suggestion that would itself be an exact value', () => {
    expect(() => validateBranchIdentifier('select', '1.5')).not.toThrow(/try/);
  });

  it.each(['', ' ', '+0'])('rejects the numeric-looking key %o', (key) => {
    expect(() => validateBranchIdentifier('plural', key)).toThrow(
      'an ICU key cannot contain punctuation or whitespace',
    );
  });

  // ICU `select` matches its cases as literal strings, so a numeric key is an
  // ordinary key there rather than an exact value.
  it('accepts a numeric key on a select', () => {
    expect(() => validateBranchIdentifier('select', '0')).not.toThrow();
    expect(() => validateBranchIdentifier('select', '42')).not.toThrow();
  });

  // A key spelled `=0` by hand reaches ICU untouched under `select`, where it
  // fails to parse. `getBranchCase` cannot normalise it away, since `=0` and
  // `0` are two different keys to a format that matches literal strings.
  it('rejects exact-value syntax on a select', () => {
    expect(() => validateBranchIdentifier('select', '=0')).toThrow(
      "Invalid select branch key '=0', an exact value is only meaningful to 'plural' and 'ordinal', write it as '0'",
    );
    expect(() => validateBranchIdentifier('select', '=42')).toThrow("write it as '42'");
  });

  it('accepts exact-value syntax on a plural or ordinal', () => {
    expect(() => validateBranchIdentifier('plural', '=0')).not.toThrow();
    expect(() => validateBranchIdentifier('ordinal', '=1')).not.toThrow();
  });
});
