import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import createPoFormatter from './formatter.js';

const fixture = (name: string) =>
  readFileSync(join(import.meta.dirname, '__fixtures__', name), 'utf8');

describe('createPoFormatter', () => {
  it('uses the .po extension', () => {
    expect(createPoFormatter().extension).toBe('.po');
  });

  describe('parse', () => {
    const messages = createPoFormatter().parse(fixture('messages.po'));

    it('reads every item from the file', () => {
      expect(messages).toHaveLength(2);
    });

    it('extracts the id from the `id:` extracted comment', () => {
      expect(messages[0]!.id).toBe('greeting');
    });

    it('keeps non-id extracted comments as trimmed comments', () => {
      expect(messages[0]!.comments).toEqual(['A friendly hello']);
    });

    it('reads message, translation, context and references', () => {
      expect(messages[0]!.message).toBe('Hello');
      expect(messages[0]!.translation).toBe('Bonjour');
      expect(messages[0]!.references).toEqual(['src/app.ts:10', 'src/app.ts:42']);
      expect(messages[1]!.context).toBe('formal');
    });

    it('leaves id undefined when there is no `id:` comment', () => {
      const parsed = createPoFormatter().parse('msgid "Plain"\nmsgstr ""\n');
      expect(parsed[0]!.id).toBeUndefined();
      expect(parsed[0]!.comments).toEqual([]);
    });
  });

  describe('stringify', () => {
    const message = {
      id: 'greeting',
      context: 'formal',
      message: 'Hello',
      translation: 'Bonjour',
      comments: ['A friendly hello'],
      references: ['src/app.ts:10', 'src/app.ts:10', 'src/b.ts:3'],
    };

    it('writes headers, id comment, context, translation and deduped references', () => {
      const out = createPoFormatter().stringify([message], { locale: 'fr' });
      expect(out).toContain('Language: fr');
      expect(out).toContain('X-Generator: saykit');
      expect(out).toContain('msgctxt "formal"');
      expect(out).toContain('msgid "Hello"');
      expect(out).toContain('msgstr "Bonjour"');
      expect(out).toContain('#. id:greeting');
      expect(out).toContain('#. A friendly hello');
      // Duplicate reference is collapsed
      expect(out.match(/src\/app\.ts:10/g)).toHaveLength(1);
    });

    it('round-trips through parse', () => {
      const formatter = createPoFormatter();
      const out = formatter.stringify([message], { locale: 'fr' });
      const [parsed] = formatter.parse(out);
      expect(parsed).toMatchObject({
        id: 'greeting',
        context: 'formal',
        message: 'Hello',
        translation: 'Bonjour',
        comments: ['A friendly hello'],
      });
    });

    it('defaults the translation to an empty string', () => {
      const out = createPoFormatter().stringify([{ message: 'Hi', comments: [], references: [] }], {
        locale: 'de',
      });
      expect(out).toContain('msgid "Hi"');
      expect(out).toContain('msgstr ""');
    });

    it('sorts messages by their source text', () => {
      const out = createPoFormatter().stringify(
        [
          { message: 'Banana', comments: [], references: [] },
          { message: 'Apple', comments: [], references: [] },
        ],
        { locale: 'de' },
      );
      expect(out.indexOf('"Apple"')).toBeLessThan(out.indexOf('"Banana"'));
    });

    it('merges headers from existing content', () => {
      const existing = 'msgid ""\nmsgstr ""\n"Project-Id-Version: my-app 1.0\\n"\n';
      const out = createPoFormatter().stringify([message], {
        locale: 'fr',
        existingContent: existing,
      });
      expect(out).toContain('Project-Id-Version: my-app 1.0');
    });

    it('handles messages with no references array', () => {
      // `references` is required by the type, but the formatter guards against
      // a missing array at runtime, exercise that guard
      const out = createPoFormatter().stringify([{ message: 'Hi', comments: [] } as never], {
        locale: 'de',
      });
      expect(out).toContain('msgid "Hi"');
    });

    it('omits references when includeReferences is false', () => {
      const out = createPoFormatter({ includeReferences: false }).stringify([message], {
        locale: 'fr',
      });
      expect(out).not.toContain('src/app.ts');
    });

    it('strips line numbers when includeLineNumbers is false', () => {
      const out = createPoFormatter({ includeLineNumbers: false }).stringify([message], {
        locale: 'fr',
      });
      expect(out).toContain('src/app.ts');
      expect(out).not.toContain('src/app.ts:10');
    });
  });
});
