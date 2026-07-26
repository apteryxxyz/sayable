import type { Formatter, Message } from '@saykit/config';
import { generateHash } from '@saykit/config/features/messages';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

/**
 * A YAML catalogue format.
 *
 * A `Formatter` is just three things: the file extension it owns, a `parse`
 * that turns file contents into `Message[]`, and a `stringify` that turns
 * `Message[]` back into file contents. Nothing else in SayKit cares what the
 * bytes look like.
 *
 * The layout below keeps the source text next to the translation, which makes
 * review diffs readable — a translator can see what they are translating
 * without opening a second file:
 *
 * ```yaml
 * locale: fr
 * messages:
 *   a1b2c3d4:
 *     source: Deployed {sha} to {environment}
 *     translation: "{sha} déployé sur {environment}"
 *     comments:
 *       - Shown in the terminal after a successful deploy.
 *     references:
 *       - src/main.ts:42
 * ```
 */

interface Entry {
  source?: string;
  translation?: string;
  context?: string;
  comments?: string[];
  references?: string[];
}

interface Catalogue {
  locale?: string;
  messages?: Record<string, Entry>;
}

export interface YamlFormatterOptions {
  /**
   * Write `references:` (the `file:line` each message was found at). Useful
   * while developing, noisy in a repository that reviews catalogue diffs.
   *
   * @default true
   */
  includeReferences?: boolean;
}

export function createYamlFormatter(options: YamlFormatterOptions = {}): Formatter {
  const { includeReferences = true } = options;

  return {
    extension: '.yml',

    parse(content) {
      const data = (parseYaml(content) ?? {}) as Catalogue;
      const messages: Message[] = [];

      for (const [id, entry] of Object.entries(data.messages ?? {})) {
        messages.push({
          id,
          message: entry.source ?? '',
          // An empty string means "not translated yet". Returning `undefined`
          // rather than `''` is what lets the fallback chain take over.
          translation: entry.translation || undefined,
          context: entry.context,
          comments: entry.comments ?? [],
          references: entry.references ?? [],
        });
      }

      return messages;
    },

    stringify(messages, { locale, existingContent }) {
      // Preserve anything a human added to this file that SayKit does not model.
      const previous = (existingContent ? parseYaml(existingContent) : null) as Catalogue | null;

      const entries: Record<string, Entry> = {};

      for (const message of [...messages].sort((a, b) => key(a).localeCompare(key(b)))) {
        const id = key(message);
        const entry: Entry = { source: message.message };

        // Never drop an existing translation because this run did not carry one.
        entry.translation = message.translation ?? previous?.messages?.[id]?.translation ?? '';

        if (message.context) entry.context = message.context;
        if (message.comments.length) entry.comments = message.comments;
        if (includeReferences && message.references.length) entry.references = message.references;

        entries[id] = entry;
      }

      // `lineWidth: 0` disables line folding. ICU messages are multi-line and
      // significant-whitespace; letting YAML wrap them would be a silent
      // corruption, and block literals keep them readable in a diff.
      return stringifyYaml({ ...previous, locale, messages: entries }, { lineWidth: 0 });
    },
  };
}

/**
 * Derive a catalogue key the way the rest of SayKit does: an explicit id when
 * the author gave one, otherwise a stable hash of the message text and its
 * context.
 *
 * A formatter must not invent its own scheme here. The transformer compiles the
 * *same* id into `say.call({ id })` at the call site, and the runtime looks
 * messages up by it — keying on, say, the raw source text would produce a
 * catalogue the runtime cannot read, and would collide for two messages with
 * identical text but different contexts.
 */
function key(message: Message) {
  return message.id ?? generateHash(message.message, message.context);
}

export default createYamlFormatter;
