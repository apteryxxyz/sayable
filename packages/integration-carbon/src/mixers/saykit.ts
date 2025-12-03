import { BaseCommand, BaseComponent, Modal } from '@buape/carbon';
import type { SayKit } from 'saykit';
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

type SayKitProps<T> = Pick<T, Extract<keyof T, Keys>>;

/**
 * Enhances a {@link BaseCommand} subclass with support for localisation.
 *
 * @param Base Abstract command constructor to extend.
 * @returns A new constructor that accepts a {@link SayKit} instance, a
 * properties-mapping function, and the original constructor arguments.
 */
export function saykit<Args extends unknown[], Instance extends BaseCommand>(
  Base: AbstractConstructor<Args, Instance>,
): AbstractConstructor<
  [
    say: SayKit,
    properties: (say: SayKit) => SayKitProps<Instance>,
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
export function saykit<
  Args extends unknown[],
  Instance extends BaseComponent | Modal,
>(
  Base: AbstractConstructor<Args, Instance>,
): AbstractConstructor<
  [properties: SayKitProps<Instance>, ...args: Args],
  Instance & Partial<Record<Keys, unknown>>
>;

/**
 * Factory function that creates a "saykit" wrapper around a base class.
 *
 * @param Base The base class constructor.
 * @returns A subclass of the given base class with extra for localisation.
 * @throws If the base class is neither a {@link BaseCommand} nor a
 * {@link BaseComponent}.
 */
export function saykit<Args extends unknown[], Instance extends object>(
  Base: AbstractConstructor<Args, Instance>,
) {
  if (ClassMap.has(Base)) return ClassMap.get(Base)!;

  if (Base.prototype instanceof BaseCommand) {
    const Derived = createSayKitCommand(Base as typeof BaseCommand);
    ClassMap.set(Base, Derived);
    return Derived;
  }

  if (Base.prototype instanceof BaseComponent || Base === Modal) {
    const Derived = createSayKitComponent(Base as typeof BaseComponent);
    ClassMap.set(Base, Derived);
    return Derived;
  }

  throw new Error('Invalid base class');
}

function createSayKitCommand<
  Args extends unknown[],
  Instance extends BaseCommand,
>(Base: AbstractConstructor<Args, Instance>) {
  // @ts-expect-error - abstract
  abstract class SayKitCommand extends Base {
    constructor(
      say: SayKit,
      properties: (
        say: SayKit,
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

  return SayKitCommand;
}

function createSayKitComponent<
  Args extends unknown[],
  Instance extends BaseComponent | Modal,
>(Base: AbstractConstructor<Args, Instance>) {
  // @ts-expect-error - abstract, unions
  abstract class SayKitComponent extends Base {
    constructor(
      properties?: Pick<Instance, Extract<keyof Instance, Keys>>,
      ...args: Args
    ) {
      super(...args);
      if (properties) Object.assign(this, properties);
    }
  }

  return SayKitComponent;
}
