import type { PropsWithChildren, ReactNode } from 'react';
import type { NumeralOptions, SelectOptions } from 'sayable/runtime';
import type { ReactifyProps } from '~/types.js';
import type * as runtime from './runtime.js';

export declare const SayProvider: typeof runtime.SayProvider;

export declare const useSay: typeof runtime.useSay;

export declare function Say(props: PropsWithChildren): ReactNode;

export declare namespace Say {
  export function Plural(
    props: { _: number } & ReactifyProps<NumeralOptions>,
  ): ReactNode;
  export function Ordinal(
    props: { _: number } & ReactifyProps<NumeralOptions>,
  ): ReactNode;
  export function Select(
    props: { _: string } & ReactifyProps<SelectOptions>,
  ): ReactNode;
}

throw new Error(
  'You are importing "@sayable/react" directly. ' +
    'This module is not meant to be used at runtime. ' +
    'Instead, use a compiler and the sayable plugin to compile macros into executable code.',
);
