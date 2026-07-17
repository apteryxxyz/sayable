import { createElement, isValidElement, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Renderer } from '~/components/renderer.js';
import { Say } from '~/runtime/index.js';

// `GET_SAY` is injected by the saykit plugin at build time. In tests we stand
// in a fake global so the component's happy path can run.
declare global {
  // eslint-disable-next-line no-var
  var GET_SAY: (() => { call: (descriptor: Record<string, unknown>) => string }) | undefined;
}

afterEach(() => {
  delete (globalThis as { GET_SAY?: unknown }).GET_SAY;
});

describe('Say', () => {
  it('throws when no id is present (used without the plugin)', () => {
    expect(() => (Say as (p: unknown) => unknown)({ context: 'x' })).toThrow(
      "'Say' is a macro and must be used with the relevant saykit plugin",
    );
  });

  it('renders through the Renderer using the resolved message html', () => {
    const call = vi.fn(() => '<name/> world');
    globalThis.GET_SAY = () => ({ call });

    const bold = createElement('b', null, 'Ada');
    const element = (Say as (p: unknown) => ReactElement)({
      id: 'greet',
      whitespace: false,
      name: bold,
    });

    expect(element.type).toBe(Renderer);
    const props = element.props as {
      html: string;
      whitespace?: boolean;
      components: (tag?: string) => unknown;
    };
    expect(props.html).toBe('<name/> world');
    expect(props.whitespace).toBe(false);
    // The descriptor passed to `say.call` has JSX-safe keys resolved and the
    // `whitespace` prop removed.
    expect(call).toHaveBeenCalledWith(expect.objectContaining({ id: 'greet', name: bold }));

    // A slot that maps to a valid element clones it; other slots pass the tag through.
    const resolved = props.components('name') as (p: object) => ReactElement;
    expect(typeof resolved).toBe('function');
    expect(isValidElement(resolved({}))).toBe(true);
    expect(props.components('missing')).toBe('missing');
    // `id` is a string, not an element, so it also passes through as the tag.
    expect(props.components('id')).toBe('id');
    // Called with no tag, it returns the (undefined) tag.
    expect(props.components()).toBeUndefined();
  });

  it('exposes Plural, Ordinal and Select macros that throw', () => {
    expect(() => Say.Plural({ _: 1, other: '#' })).toThrow("'Say.Plural' is a macro");
    expect(() => Say.Ordinal({ _: 1, other: '#' })).toThrow("'Say.Ordinal' is a macro");
    expect(() => Say.Select({ _: 'a', other: 'b' })).toThrow("'Say.Select' is a macro");
  });
});
