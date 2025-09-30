import { BaseCommand, BaseComponent, Modal } from '@buape/carbon';
import type { Sayable } from 'sayable';
import { combineCommandOptions } from '~/utils/combine-command-options.js';

type Keys =
  | 'name'
  | 'description'
  | 'label'
  | 'title'
  | 'placeholder'
  | 'content'
  | 'options'
  | 'components'
  | 'subcommands'
  | 'subcommandGroups';

type AbstractConstructor<
  // biome-ignore lint/suspicious/noExplicitAny: any
  Args extends any[] = any[],
  Instance extends object = object,
> = abstract new (...args: Args) => Instance;

const ClassMap = new WeakMap<AbstractConstructor, AbstractConstructor>();

type SayableProps<T> = Pick<T, Extract<keyof T, Keys>>;

/**
 * Enhances a {@link BaseCommand} subclass with support for localisation.
 *
 * @param Base Abstract command constructor to extend.
 * @returns A new constructor that accepts a {@link Sayable} instance, a
 * properties-mapping function, and the original constructor arguments.
 */
export function sayable<Args extends unknown[], Instance extends BaseCommand>(
  Base: AbstractConstructor<Args, Instance>,
): AbstractConstructor<
  [
    say: Sayable,
    properties: (say: Sayable) => SayableProps<Instance>,
    ...args: Args,
  ],
  Instance & Partial<Record<Keys, unknown>>
>;

/**
 * Enhances a {@link BaseComponent} or {@link Modal} subclass with
 * support for localisation.
 *
 * @param Base Abstract component or modal constructor to extend.
 * @returns A new constructor that accepts a set of properties.
 */
export function sayable<
  Args extends unknown[],
  Instance extends BaseComponent | Modal,
>(
  Base: AbstractConstructor<Args, Instance>,
): AbstractConstructor<
  [properties: SayableProps<Instance>, ...args: Args],
  Instance & Partial<Record<Keys, unknown>>
>;

/**
 * Factory function that creates a "sayable" wrapper around a base class.
 *
 * @param Base The base class constructor.
 * @returns A subclass of the given base class with extra for localisation.
 * @throws If the base class is neither a {@link BaseCommand} nor a
 * {@link BaseComponent}.
 */
export function sayable<Args extends unknown[], Instance extends object>(
  Base: AbstractConstructor<Args, Instance>,
) {
  if (ClassMap.has(Base)) return ClassMap.get(Base)!;

  if (Base.prototype instanceof BaseCommand) {
    const Derived = createSayableCommand(Base as typeof BaseCommand);
    ClassMap.set(Base, Derived);
    return Derived;
  }

  if (Base.prototype instanceof BaseComponent || Base === Modal) {
    const Derived = createSayableComponent(Base as typeof BaseComponent);
    ClassMap.set(Base, Derived);
    return Derived;
  }

  throw new Error('Invalid base class');
}

function createSayableCommand<
  Args extends unknown[],
  Instance extends BaseCommand,
>(Base: AbstractConstructor<Args, Instance>) {
  // @ts-expect-error - abstract
  abstract class SayableCommand extends Base {
    constructor(
      say: Sayable,
      properties: (
        say: Sayable,
      ) => Pick<Instance, Extract<keyof Instance, Keys>>,
      ...args: Args
    ) {
      super(...args);

      const records = {};
      for (const locale of say.locales) {
        const s = say.clone().activate(locale);
        Reflect.set(records, locale, properties(s));
      }

      const options = combineCommandOptions(records, say.locale);
      Object.assign(this, options);
    }
  }

  return SayableCommand;
}

function createSayableComponent<
  Args extends unknown[],
  Instance extends BaseComponent | Modal,
>(Base: AbstractConstructor<Args, Instance>) {
  // @ts-expect-error - abstract, unions
  abstract class SayableComponent extends Base {
    constructor(
      properties?: Pick<Instance, Extract<keyof Instance, Keys>>,
      ...args: Args
    ) {
      super(...args);
      if (properties) Object.assign(this, properties);
    }
  }

  return SayableComponent;
}
