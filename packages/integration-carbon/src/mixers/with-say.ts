import { BaseCommand, BaseComponent, Modal } from '@buape/carbon';
import type { Catalogue, View } from 'saykit';
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
  Args extends any[] = any[],
  Instance extends object = object,
> = abstract new (...args: Args) => Instance;

const ClassMap = new WeakMap<AbstractConstructor, AbstractConstructor>();

type SayProps<T> = Pick<T, Extract<keyof T, Keys>>;

/**
 * Enhances a {@link BaseCommand} subclass with support for localisation.
 *
 * @param Base Abstract command constructor to extend.
 * @returns A new constructor that accepts a {@link Catalogue}, a
 * properties-mapping function, and the original constructor arguments.
 */
export function withSay<Args extends unknown[], Instance extends BaseCommand>(
  Base: AbstractConstructor<Args, Instance>,
): AbstractConstructor<
  [catalogue: Catalogue, properties: (say: View) => SayProps<Instance>, ...args: Args],
  Instance & Partial<Record<Keys, unknown>>
>;

/**
 * Enhances a {@link BaseComponent} or {@link Modal} subclass with
 * support for localisation.
 *
 * @param Base Abstract component or modal constructor to extend.
 * @returns A new constructor that accepts a set of properties.
 */
export function withSay<Args extends unknown[], Instance extends BaseComponent | Modal>(
  Base: AbstractConstructor<Args, Instance>,
): AbstractConstructor<
  [properties: SayProps<Instance>, ...args: Args],
  Instance & Partial<Record<Keys, unknown>>
>;

/**
 * Factory function that creates a "withSay" wrapper around a base class.
 *
 * @param Base The base class constructor.
 * @returns A subclass of the given base class with extra for localisation.
 * @throws If the base class is neither a {@link BaseCommand} nor a
 * {@link BaseComponent}.
 */
export function withSay<Args extends unknown[], Instance extends object>(
  Base: AbstractConstructor<Args, Instance>,
) {
  if (ClassMap.has(Base)) return ClassMap.get(Base)!;

  if (Base.prototype instanceof BaseCommand) {
    const Derived = createSayCommand(Base as typeof BaseCommand);
    ClassMap.set(Base, Derived);
    return Derived;
  }

  if (Base.prototype instanceof BaseComponent || Base === Modal) {
    const Derived = createSayComponent(Base as typeof BaseComponent);
    ClassMap.set(Base, Derived);
    return Derived;
  }

  throw new Error('Invalid base class');
}

function createSayCommand<Args extends unknown[], Instance extends BaseCommand>(
  Base: AbstractConstructor<Args, Instance>,
) {
  // @ts-expect-error - abstract
  abstract class SayCommand extends Base {
    constructor(
      catalogue: Catalogue,
      properties: (say: View) => Pick<Instance, Extract<keyof Instance, Keys>>,
      ...args: Args
    ) {
      super(...args);

      const records = Array.from(catalogue).reduce<Record<string, any>>((acc, [say, locale]) => {
        acc[locale] = properties(say);
        return acc;
      }, {});

      // Discord takes one set of names and localisations for the rest, so the
      // catalogue's default locale is the one the command is registered under.
      const options = combineCommandOptions(records, catalogue.defaultLocale);
      Object.assign(this, options);
    }
  }

  return SayCommand;
}

function createSayComponent<Args extends unknown[], Instance extends BaseComponent | Modal>(
  Base: AbstractConstructor<Args, Instance>,
) {
  // @ts-expect-error - abstract, unions
  abstract class SayComponent extends Base {
    constructor(properties?: Pick<Instance, Extract<keyof Instance, Keys>>, ...args: Args) {
      super(...args);
      if (properties) Object.assign(this, properties);
    }
  }

  return SayComponent;
}
