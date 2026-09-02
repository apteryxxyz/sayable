import type { Message, Transformer } from '@saykit/config';
import { generateHash } from '@saykit/config/features/messages';

/**
 * A transformer for `.email` templates — plain-text files that are not
 * JavaScript at all.
 *
 * A `Transformer` is three functions:
 *
 * - `match(id)`   — does this transformer own the file?
 * - `extract(code, id)` — what messages are in it?
 * - `transform(code, id)` — what JavaScript should the bundler see instead?
 *
 * The built-in `@saykit/transform-js` rewrites macros *inside* JS. Nothing says
 * a transformer has to: this one turns a whole non-JS file into a module that
 * exports one localised function. The bundler never learns that `.email` was
 * not JavaScript, because by the time it looks, it is.
 *
 * File format — leading `#` lines are translator comments, the rest is the body:
 *
 * ```
 * # Sent to the on-call engineer after a deploy finishes.
 * Deployed {sha} to {environment} in {minutes} minutes.
 * ```
 */
export function createEmailTransformer(): Transformer {
  return {
    match(id) {
      return id.endsWith('.email');
    },

    extract(code, id) {
      const message = parseTemplate(code, id);
      return message ? [message] : [];
    },

    transform(code, id) {
      const message = parseTemplate(code, id);

      if (!message) return 'export default () => "";\n';

      const key = generateHash(message.message, message.context);

      // The emitted module takes the `View` as an argument rather than
      // importing one. A template should not decide which catalogue it belongs
      // to: the caller does, and that keeps this compatible with the
      // per-request `catalogue.locale(locale)` the server examples use.
      return [
        `// generated from ${id} by the .email transformer`,
        `export default function render(say, values = {}) {`,
        `  return say.call({ id: ${JSON.stringify(key)}, ...values });`,
        `}`,
        '',
      ].join('\n');
    },
  };
}

function parseTemplate(code: string, id: string): Message | null {
  const comments: string[] = [];
  const body: string[] = [];

  for (const line of code.split(/\r?\n/)) {
    if (body.length === 0 && line.startsWith('#')) {
      comments.push(line.slice(1).trim());
    } else {
      body.push(line);
    }
  }

  const message = body.join('\n').trim();
  if (!message) return null;

  return {
    message,
    translation: undefined,
    id: undefined,
    context: undefined,
    comments,
    references: [id],
  };
}

export default createEmailTransformer;
