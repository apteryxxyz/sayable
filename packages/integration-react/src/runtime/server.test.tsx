import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createCatalogue } from 'saykit';
import { describe, expect, it, vi } from 'vitest';

// React's `cache` only memoises inside a Server Component render. Under test we
// replace it with a plain single-value memoiser so the server context ref is
// shared across `setSay`/`getSay` the way it is at runtime.
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

const { getSay, setSay, unstable_createWithSay } = await import('~/runtime/server.js');

const make = () => createCatalogue({ en: { greeting: 'Hi' }, fr: { greeting: 'Salut' } });

describe('server runtime', () => {
  // Runs first, before any setSay, so the ref is still uninitialised.
  it('getSay throws before setSay has been called', () => {
    expect(() => getSay()).toThrow(
      'Attempt to access the server-only Say view before initialisation',
    );
  });

  it('setSay stores the view it is given', () => {
    const say = make().locale('fr');
    setSay(say);
    expect(getSay().locale).toBe('fr');
    // Identity compared as a boolean, because `expect(...).toBe(say)` recurses on
    // views in vitest's matcher and overflows the stack.
    expect(getSay() === (say as unknown)).toBe(true);
    expect(Object.isFrozen(getSay())).toBe(true);
  });

  it('unstable_createWithSay binds the matched locale and injects props', async () => {
    const withSay = unstable_createWithSay(make());
    const Wrapped = withSay(
      (props: { locale: string; messages: { greeting: string } }) =>
        createElement('span', null, `${props.locale}:${props.messages.greeting}`),
      () => 'fr-CA',
    );

    const element = await Wrapped({} as never);
    expect(renderToStaticMarkup(element)).toBe('<span>fr:Salut</span>');
    expect(getSay().locale).toBe('fr');
  });
});
