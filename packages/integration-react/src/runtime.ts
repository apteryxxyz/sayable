'use client';

import {
  cloneElement,
  createContext,
  createElement,
  isValidElement,
  type PropsWithChildren,
  type ReactElement,
  useContext,
} from 'react';
import HTML2React, {
  type HTML2ReactProps,
} from 'react-html-string-parser/HTML2React';
import { Sayable } from 'sayable';
import { decodeJsxSafePropKeys } from './types.js';

const SayContext = //
  createContext<ReturnType<Sayable['freeze']> | null>(null);

/**
 * Provide a localised {@link runtime.Sayable} instance to descendant components via context.
 * Must wrap any component tree using {@link useSay} or {@link Say}.
 *
 * @param props.locale The current locale
 * @param props.messages The current messages for the locale
 */
export function SayProvider({
  locale,
  locales,
  messages,
  children,
}: PropsWithChildren<{
  locale: string;
  locales: string[];
  messages: Sayable.Messages;
}>) {
  const say = new Sayable({});
  say.assign(locale, messages);
  for (const l of locales) say.assign(l, {});
  say.activate(locale);
  return createElement(SayContext.Provider, { value: say.freeze() }, children);
}

/**
 * Get the current {@link Sayable} instance.
 * Must be called within a {@link SayProvider}.
 *
 * @returns The current {@link Sayable} instance
 * @throws If no provider is in the component tree
 */
export function useSay() {
  const say = useContext(SayContext);
  if (!say) throw new Error("'useSay' must be used within a 'SayProvider'");
  return say;
}

/**
 * Render the translation for a descriptor.
 *
 * @param descriptor Descriptor to render the translation for
 * @returns The translation node for the descriptor
 */
export function Say(
  _descriptor: { id: string; [match: string]: unknown },
  descriptor = decodeJsxSafePropKeys(_descriptor),
) {
  const say = useSay();
  return createElement(HTML2React, {
    html: say.call(descriptor),
    getComponent(tag: string) {
      if (tag in descriptor && isValidElement(descriptor[tag])) {
        const element = descriptor[tag] as ReactElement;
        return ({ children }) => cloneElement(element, undefined, ...children);
      } else {
        return ({ children }) => createElement(tag, undefined, ...children);
      }
    },
  } satisfies HTML2ReactProps);
}
