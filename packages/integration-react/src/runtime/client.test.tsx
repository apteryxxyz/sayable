import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SayProvider, useSay } from '~/runtime/client.js';

function Consumer() {
  const say = useSay();
  return createElement('span', null, `${say.locale}:${say.messages.greeting}`);
}

describe('SayProvider / useSay', () => {
  it('provides a frozen, activated Say instance to descendants', () => {
    const html = renderToStaticMarkup(
      createElement(
        SayProvider,
        { locale: 'fr', messages: { greeting: 'Bonjour' } },
        createElement(Consumer),
      ),
    );
    expect(html).toBe('<span>fr:Bonjour</span>');
  });

  it('throws when used outside a provider', () => {
    expect(() => renderToStaticMarkup(createElement(Consumer))).toThrow(
      "'useSay' must be used within a 'SayProvider'",
    );
  });
});
