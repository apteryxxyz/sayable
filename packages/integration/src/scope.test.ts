import { AsyncLocalStorage } from 'node:async_hooks';
import { inspect } from 'node:util';
import { describe, expect, it } from 'vitest';
import { createCatalogue } from './catalogue.js';
import { createScope, type Scope } from './scope.js';
import { createStore } from './store.js';
import { createView, type View } from './view.js';

const messages = {
  en: { greeting: 'Hello' },
  fr: { greeting: 'Bonjour' },
};

const en = createView('en', messages.en);
const fr = createView('fr', messages.fr);

/**
 * Both storages a scope is built over: node's own, and the variable a scope
 * falls back to when it is given none. Everything except isolation across an
 * await is the same either way, so the same block runs over both.
 */
const storages: Record<string, () => Scope> = {
  'a variable': () => createScope(),
  'an AsyncLocalStorage': () => createScope(new AsyncLocalStorage<View>()),
};

describe.each(Object.entries(storages))('createScope over %s', (_name, build) => {
  it('has no view until one is established', () => {
    const { say } = build();

    expect(() => say.locale).toThrow(/No view is in scope/);
  });

  it('reads the view of the enclosing run', () => {
    const scope = build();
    scope.run(en, () => {
      expect(scope.say.locale).toBe('en');
      expect(scope.say.call({ id: 'greeting' })).toBe('Hello');
      expect(scope.say.messages).toBe(en.messages);
    });
  });

  it('passes arguments through and hands back what the callback returned', () => {
    const scope = build();
    expect(scope.run(en, (a: number, b: number) => a + b + scope.say.locale.length, 1, 2)).toBe(5);
  });

  it('reads the innermost run', () => {
    const scope = build();
    scope.run(en, () => {
      scope.run(fr, () => {
        expect(scope.say.locale).toBe('fr');
      });
      expect(scope.say.locale).toBe('en');
    });
  });

  it('puts the previous view back when a run throws', () => {
    const scope = build();
    expect(() =>
      scope.run(en, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(() => scope.say.locale).toThrow(/No view is in scope/);
  });

  it('reads a view established outside any run', () => {
    const scope = build();
    const restore = scope.use(en);
    expect(scope.say.locale).toBe('en');
    restore();
    expect(() => scope.say.locale).toThrow(/No view is in scope/);
  });

  it('follows a store it was given', () => {
    const scope = build();
    const store = createStore(createCatalogue(messages), 'en');

    scope.use(store);
    expect(scope.say.locale).toBe('en');
    store.set('fr');
    expect(scope.say.locale).toBe('fr');
  });

  it('prefers the enclosing run over what it was given', () => {
    const scope = build();
    scope.use(en);
    scope.run(fr, () => {
      expect(scope.say.locale).toBe('fr');
    });
    expect(scope.say.locale).toBe('en');
  });

  it('restores what it was given before, not nothing', () => {
    const scope = build();
    scope.use(en);
    const restore = scope.use(fr);
    restore();
    expect(scope.say.locale).toBe('en');
  });

  it('leaves a later use alone when an earlier restore is called', () => {
    const scope = build();
    const restore = scope.use(en);
    scope.use(fr);
    restore();
    expect(scope.say.locale).toBe('fr');
  });

  it('tells two uses of the same view apart', () => {
    const scope = build();
    const restore = scope.use(en);
    scope.use(en);
    restore();
    expect(scope.say.locale).toBe('en');
  });

  it('does nothing the second time a restore is called', () => {
    const scope = build();
    const restore = scope.use(en);
    restore();
    scope.use(fr);
    restore();
    expect(scope.say.locale).toBe('fr');
  });

  it('reads a view through the proxy the way it reads the view itself', () => {
    const scope = build();
    scope.run(en, () => {
      expect(Object.keys(scope.say)).toEqual(Object.keys(en));
      expect('locale' in scope.say).toBe(true);
      expect(scope.say.messages).toEqual(messages.en);
    });
  });

  it('refuses to be written through', () => {
    const scope = build();
    scope.run(en, () => {
      expect(() => {
        // @ts-expect-error locale is readonly, and a scope is not somewhere to
        // put a view anyway
        scope.say.locale = 'fr';
      }).toThrow(TypeError);
    });
  });

  it('throws the macro error when an untransformed call reaches it', () => {
    const scope = build();
    scope.run(en, () => {
      expect(() => (scope.say as unknown as (s: TemplateStringsArray) => string)`Hi`).toThrow(
        /macro/,
      );
    });
  });

  it('does not let its methods be swapped out', () => {
    expect(Object.isFrozen(build())).toBe(true);
  });

  it('inspects as the locale it resolves to', () => {
    const scope = build();
    expect(inspect(scope)).toBe('Scope<unset> {}');
    scope.run(en, () => {
      expect(inspect(scope)).toBe("Scope<'en'> {}");
    });
  });
});

describe('createScope over an AsyncLocalStorage', () => {
  it('keeps a view across awaits, and concurrent runs apart', async () => {
    const scope = createScope(new AsyncLocalStorage<View>());

    async function read(delay: number) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return scope.say.locale;
    }

    const [first, second] = await Promise.all([
      scope.run(en, () => read(10)),
      scope.run(fr, () => read(0)),
    ]);

    expect(first).toBe('en');
    expect(second).toBe('fr');
    expect(() => scope.say.locale).toThrow(/No view is in scope/);
  });
});

describe('createScope over a variable', () => {
  it('loses its view at the first await, which is why a server wants a storage', async () => {
    const scope = createScope();

    const done = scope.run(en, async () => {
      expect(scope.say.locale).toBe('en');
      await Promise.resolve();
      return () => scope.say.locale;
    });

    expect(await done).toThrow(/No view is in scope/);
  });
});
