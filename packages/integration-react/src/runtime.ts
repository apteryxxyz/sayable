'use client';

import {
  cloneElement,
  createContext,
  createElement,
  isValidElement,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
  useContext,
} from 'react';
import { type NumeralOptions, Sayable, type SelectOptions } from 'sayable';
import { Renderer } from './components/renderer.js';
import { decodeJsxSafePropKeys, type PropsWithJSXSafeKeys } from './types.js';

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
  for (const l of locales) say.assign(l, messages);
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
 * @remark This is a macro and must be used with the relevant sayable plugin
 */
// @ts-expect-error macro
export function Say(
  props: PropsWithChildren<{ context?: string }>,
): ReactElement;
export function Say(
  _descriptor: { id: string; [match: string]: unknown },
  descriptor = decodeJsxSafePropKeys(_descriptor),
) {
  if (!('id' in descriptor))
    throw new Error(
      "'Say' is a macro and must be used with the relevant sayable plugin",
      {
        cause: new Error("The 'id' property is required for a descriptor"),
      },
    );

  const say = useSay();
  return createElement(Renderer, {
    html: say.call(descriptor),
    components(tag?: string) {
      if (tag && tag in descriptor && isValidElement(descriptor[tag])) {
        const element = descriptor[tag]! as ReactElement;
        return (props) =>
          cloneElement(element, { ...(element.props ?? {}), ...props });
      } else {
        return tag;
      }
    },
  });
}

export namespace Say {
  // ===== Macros ===== //

  /**
   * Define a pluralised message.
   *
   * @example
   * ```tsx
   * <Say.Plural
   *   _={count}
   *   one="You have 1 item"
   *   other="You have # items"
   * />
   * ```
   *
   * @param props._ Number to determine the plural form of
   * @param props Options pluralisation rules keyed by CLDR categories or specific numbers
   * @returns The plural form of the number, as a React node
   * @remark This is a macro and must be used with the relevant sayable plugin
   */
  export function Plural(
    props: { _: number } & PropsWithJSXSafeKeys<NumeralOptions>,
  ): ReactNode {
    void props;
    throw new Error(
      "'Say.Plural' is a macro and must be used with the relevant sayable plugin",
    );
  }

  /**
   * Define an ordinal message (e.g. "1st", "2nd", "3rd").
   *
   * @example
   * ```tsx
   * <Say.Ordinal
   *   _={position}
   *   1="#st"
   *   2="#nd"
   *   3="#rd"
   *   other="#th"
   * />
   * ```
   *
   * @param props._ Number to determine the ordinal form of
   * @param props Options ordinal rules keyed by CLDR categories or specific numbers
   * @returns The ordinal form of the number, as a React node
   * @remark This is a macro and must be used with the relevant sayable plugin
   */
  export function Ordinal(
    props: { _: number } & PropsWithJSXSafeKeys<NumeralOptions>,
  ): ReactNode {
    void props;
    throw new Error(
      "'Say.Ordinal' is a macro and must be used with the relevant sayable plugin",
    );
  }

  /**
   * Define a select message, useful for handling gender, status, or other categories.
   *
   * @example
   * ```tsx
   * <Say.Select
   *   _={gender}
   *   male="He"
   *   female="She"
   *   other="They"
   * />
   * ```
   *
   * @param props._ Selector value to determine which option is chosen
   * @param props Options a mapping of possible selector values to message strings
   * @returns The select form of the value, as a React node
   * @remark This is a macro and must be used with the relevant sayable plugin
   */
  export function Select(
    props: { _: string } & PropsWithJSXSafeKeys<SelectOptions>,
  ): ReactNode {
    void props;
    throw new Error(
      "'Say.Select' is a macro and must be used with the relevant sayable plugin",
    );
  }
}
