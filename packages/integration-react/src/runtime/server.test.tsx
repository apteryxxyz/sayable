import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createCatalogue } from 'saykit';
import { describe, expect, it, vi } from 'vitest';

// React's `cache` only memoises inside a Server Component render. Under test we
// replace it with a plain single-value memoiser, so the request cell is shared
// across a scope and the reads below it the way it is at runtime.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    cache: <A extends unknown[], R>(fn: (...args: A) => R) => {
      let has = false;
      let value: R;
      return (...args: A) => {
        if (!has) {
          value = fn(...args);
          has = true;
        }
        return value;
      };
    },
  };
});

const { getSay, SayScope } = await import('~/runtime/server.js');
const { SayProvider } = await import('~/runtime/client.server.js');

const make = () =>
  createCatalogue({
    en: { greeting: 'Hi' },
    fr: () => Promise.resolve({ default: { greeting: 'Salut' } }),
  });

describe('server runtime', () => {
  // Runs first, before any scope, so the request cell is still empty.
  it('throws before a scope has been established', () => {
    expect(() => getSay()).toThrow("'getSay' must be called below a 'SayScope'");
  });

  it('SayScope negotiates the locale, loads it, and returns its children', async () => {
    const children = createElement('span', null, 'inside');
    const rendered = await SayScope({ catalogue: make(), locale: 'fr-CA', children });

    expect(rendered).toBe(children);
    expect(getSay().locale).toBe('fr');
    expect(getSay().messages.greeting).toBe('Salut');
  });

  it('takes a view as it is, instead of a catalogue and a locale', async () => {
    const view = await make().load('fr');
    await SayScope({ view, children: null });

    expect(getSay() === (view as unknown)).toBe(true);
  });

  it('the server build of SayProvider fills its props from the scope', async () => {
    await SayScope({ catalogue: make(), locale: 'en' });

    const html = renderToStaticMarkup(
      createElement(SayProvider, null, createElement('span', null, 'child')),
    );
    expect(html).toBe('<span>child</span>');

    const element = SayProvider({ children: null });
    const props = element.props as { locale: string; messages: { greeting: string } };
    expect(props.locale).toBe('en');
    expect(props.messages.greeting).toBe('Hi');
  });
});
