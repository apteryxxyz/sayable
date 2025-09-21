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
import { Sayable } from 'sayable/runtime';

const SayContext = //
  createContext<ReturnType<Sayable['freeze']>>(undefined!);

export function SayProvider({
  locale,
  messages,
  children,
}: PropsWithChildren<{
  locale: string;
  messages: Sayable.Messages;
}>) {
  const say = new Sayable({});
  say.assign(locale, messages);
  say.activate(locale);
  return createElement(SayContext.Provider, { value: say.freeze() }, children);
}

export function useSay() {
  const say = useContext(SayContext);
  if (!say) throw new Error("'useSay' must be used within a 'SayProvider'");
  return say;
}

export function Say(descriptor: { id: string; [match: string]: unknown }) {
  const say = useSay();
  return createElement(HTML2React, {
    html: say.call(descriptor),
    getComponent(tag: string) {
      if (`_${tag}` in descriptor && isValidElement(descriptor[`_${tag}`])) {
        const element = descriptor[`_${tag}`] as ReactElement;
        return ({ children }) => cloneElement(element, undefined, ...children);
      }
      return undefined;
    },
  } satisfies HTML2ReactProps);
}
