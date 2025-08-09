import type { Message } from './message-types.js';

/**
 * Generates the ICU MessageFormat string for a message.
 */
export function generateIcuMessageFormat(message: Message): string {
  switch (message.type) {
    case 'literal':
      return String(message.text);

    case 'composite':
      return Object.entries(message.children)
        .map(([, m]) => generateIcuMessageFormat(m))
        .join('');

    case 'argument':
      return `{${message.identifier}}`;

    case 'choice': {
      const options = Object.entries(message.children)
        .map(([k, m]) => {
          const key = k.match(/^\d+$/) ? `=${k}` : k;
          return `  ${key} {${generateIcuMessageFormat(m)}}\n`;
        })
        .join('');

      const format =
        message.kind === 'ordinal' ? 'selectordinal' : message.kind;
      return `{${message.identifier}, ${format},\n${options}}`;
    }
  }
}
