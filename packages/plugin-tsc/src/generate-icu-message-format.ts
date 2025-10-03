/**
 * KEEP IN SYNC:
 * - `packages/plugin-tsc/src/generate-icu-message-format.ts`
 * - `packages/plugin-swc/src/generate_icu_message_format.rs`
 */

import type { Message } from './message-types.js';

/**
 * Generate the ICU MessageFormat string for an extracted message.
 *
 * @param message The message to generate the ICU MessageFormat string for
 * @returns The ICU MessageFormat string
 */
export function generateIcuMessageFormat(message: Message): string {
  return internalGenerateIcuMessageFormat(message).trim();
}

function internalGenerateIcuMessageFormat(message: Message): string {
  switch (message.type) {
    case 'literal': {
      return String(message.text);
    }

    case 'argument': {
      return `{${message.identifier}}`;
    }

    case 'element': {
      if (message.children.length === 0) return `<${message.identifier}/>`;

      const children = message.children
        .map((m) => internalGenerateIcuMessageFormat(m))
        .join('');
      return `<${message.identifier}>${children}</${message.identifier}>`;
    }

    case 'choice': {
      const options = Object.entries(message.branches)
        .map(([k, m]) => {
          const key = k.match(/^\d+$/) ? `=${k}` : k;
          return `  ${key} {${internalGenerateIcuMessageFormat(m)}}\n`;
        })
        .join('');

      const format =
        message.kind === 'ordinal' ? 'selectordinal' : message.kind;
      return `{${message.identifier}, ${format},\n${options}}`;
    }

    case 'composite': {
      return Object.entries(message.children)
        .map(([, m]) => internalGenerateIcuMessageFormat(m))
        .join('');
    }
  }
}
