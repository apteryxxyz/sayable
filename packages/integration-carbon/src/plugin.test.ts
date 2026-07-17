import { BaseInteraction, Guild } from '@buape/carbon';
import { Say } from 'saykit';
import { afterEach, describe, expect, it } from 'vitest';
import { kSay } from '~/constants.js';
import { SayPlugin } from '~/plugin.js';

const makeSay = () => new Say({ locales: ['en', 'fr'], messages: { en: {}, fr: {} } });

// Constructing the plugin installs the `say` getters on the Carbon prototypes.
const say = makeSay();
const plugin = new SayPlugin(say);

// Keep the global registered by default; individual tests may clear it.
afterEach(() => Reflect.set(globalThis, kSay, say));

/** Minimal object backed by a Carbon prototype, carrying the raw data the getter reads. */
const proto = <T>(prototype: object, rawData: unknown) => {
  const object = Object.create(prototype);
  // `rawData` is a getter on some Carbon prototypes; define an own data property
  // to shadow it.
  Object.defineProperty(object, 'rawData', { value: rawData, configurable: true });
  return object as T;
};

describe('SayPlugin', () => {
  it('has the saykit id and registers the say instance globally', () => {
    expect(plugin.id).toBe('saykit');
    expect(Reflect.get(globalThis, kSay)).toBe(say);
  });
});

describe('guild `say` extension', () => {
  it('clones, matches and activates the preferred locale', () => {
    const guild = proto<Guild>(Guild.prototype, { preferred_locale: 'fr' });
    expect(guild.say.locale).toBe('fr');
    // Second access reuses the per-guild clone.
    expect(guild.say.locale).toBe('fr');
  });

  it('throws when no say instance is registered', () => {
    Reflect.deleteProperty(globalThis, kSay);
    const guild = proto<Guild>(Guild.prototype, { preferred_locale: 'fr' });
    expect(() => guild.say).toThrow('No `say` instance available');
  });
});

describe('interaction `say` extension', () => {
  it('clones, matches and activates the interaction locale', () => {
    const interaction = proto<BaseInteraction<never>>(BaseInteraction.prototype, { locale: 'fr' });
    expect(interaction.say.locale).toBe('fr');
  });

  it('throws when no say instance is registered', () => {
    Reflect.deleteProperty(globalThis, kSay);
    const interaction = proto<BaseInteraction<never>>(BaseInteraction.prototype, { locale: 'fr' });
    expect(() => interaction.say).toThrow('No `say` instance available');
  });
});
