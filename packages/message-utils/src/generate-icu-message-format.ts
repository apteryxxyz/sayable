/**
 * KEEP IN SYNC:
 * - `packages/message-utils/src/icu-generator.ts`
 * - `packages/swc-plugin/src/icu_generator.rs`
 */

import type { Message } from './message-types.js';

/**
 * Generate the ICU MessageFormat string for an extracted message.
 *
 * @param message The message to generate the ICU MessageFormat string for
 * @returns The ICU MessageFormat string
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

    case 'element': {
      const children = Object.values(message.children)
        .map((m) => generateIcuMessageFormat(m))
        .join('');
      return `<${message.identifier}>${children}</${message.identifier}>`;
    }

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
