import { Locale } from '@buape/carbon';
import { describe, expect, it } from 'vitest';
import { combineCommandOptions } from './combine-command-options.js';

describe('combineCommandOptions', () => {
  it('builds name/description localizations from other locales', () => {
    const result = combineCommandOptions(
      {
        [Locale.EnglishUS]: { name: 'color', description: 'Pick a colour' },
        [Locale.French]: { name: 'couleur', description: 'Choisir une couleur' },
      },
      Locale.EnglishUS,
    );

    expect(result.name).toBe('color');
    expect(result.name_localizations[Locale.French]).toBe('couleur');
    expect(result.description_localizations[Locale.French]).toBe('Choisir une couleur');
  });

  it('recurses into nested options and choices', () => {
    const result = combineCommandOptions(
      {
        [Locale.EnglishUS]: {
          name: 'cmd',
          description: 'root',
          options: [{ name: 'shade', description: 'a shade' }],
          choices: [{ name: 'red' }],
        },
        [Locale.French]: {
          name: 'cmd',
          description: 'racine',
          options: [{ name: 'teinte', description: 'une teinte' }],
          choices: [{ name: 'rouge' }],
        },
      },
      Locale.EnglishUS,
    );

    expect(result.options[0].name_localizations[Locale.French]).toBe('teinte');
    expect(result.choices[0].name_localizations[Locale.French]).toBe('rouge');
  });

  it('ignores locales that are not valid Discord locales', () => {
    const result = combineCommandOptions(
      {
        [Locale.EnglishUS]: { name: 'x', description: 'd' },
        'not-a-locale': { name: 'y', description: 'e' },
      },
      Locale.EnglishUS,
    );
    expect(result.name_localizations).toEqual({});
  });
});
