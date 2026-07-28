// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
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

  it('rebuilds the instance when the locale changes', () => {
    const { rerender } = render(
      <SayProvider locale="fr" messages={{ greeting: 'Bonjour' }}>
        <Consumer />
      </SayProvider>,
    );
    expect(screen.getByText('fr:Bonjour')).toBeDefined();

    rerender(
      <SayProvider locale="de" messages={{ greeting: 'Guten Tag' }}>
        <Consumer />
      </SayProvider>,
    );
    expect(screen.getByText('de:Guten Tag')).toBeDefined();
  });

  it('throws when used outside a provider', () => {
    expect(() => renderToStaticMarkup(createElement(Consumer))).toThrow(
      "'useSay' must be used within a 'SayProvider'",
    );
  });
});
