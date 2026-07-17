import { describe, expect, it } from 'vitest';
import type { Message } from '~/shapes.js';
import { mergeExtractedMessages, reconcileLocaleMessages } from './merge.js';

const msg = (m: Partial<Message> & { message: string }): Message => ({
  translation: undefined,
  comments: [],
  references: [],
  ...m,
});

describe('mergeExtractedMessages', () => {
  it('merges duplicates by id, unioning comments and references', () => {
    const merged = mergeExtractedMessages([
      msg({ id: 'a', message: 'Hi', comments: ['one'], references: ['x.ts:1'] }),
      msg({ id: 'a', message: 'Hi', comments: ['two', 'one'], references: ['x.ts:1', 'y.ts:2'] }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.comments).toEqual(['one', 'two']);
    expect(merged[0]!.references).toEqual(['x.ts:1', 'y.ts:2']);
  });

  it('keys by content hash when no id is present', () => {
    const merged = mergeExtractedMessages([
      msg({ message: 'Same' }),
      msg({ message: 'Same' }),
      msg({ message: 'Different' }),
    ]);
    expect(merged).toHaveLength(2);
  });
});

describe('reconcileLocaleMessages', () => {
  it('keeps existing translations while refreshing metadata', () => {
    const existing = [msg({ id: 'a', message: 'Hi', translation: 'Salut' })];
    const next = [msg({ id: 'a', message: 'Hi', comments: ['new'], references: ['a.ts:3'] })];
    const [reconciled] = reconcileLocaleMessages(existing, next);
    expect(reconciled!.translation).toBe('Salut');
    expect(reconciled!.comments).toEqual(['new']);
    expect(reconciled!.references).toEqual(['a.ts:3']);
  });

  it('adds new messages with an undefined translation', () => {
    const [reconciled] = reconcileLocaleMessages([], [msg({ id: 'b', message: 'New' })]);
    expect(reconciled!.translation).toBeUndefined();
    expect(reconciled!.message).toBe('New');
  });
});
