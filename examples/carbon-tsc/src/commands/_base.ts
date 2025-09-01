// @ts-nocheck

// NOTE: This is very hacky and is mostly a proof of concept, it doesn't cover every case where localisation might be needed, but it works
// IDEA: Move all this to a separate "integration" package?

import { BaseInteraction, Command, Locale } from '@buape/carbon';
import say from '../i18n.js';

const allowedLocales = Object.values(Locale);

export function combineLocalisations<T extends object>(
  localisationRecords: Record<string, T>,
  defaultLocale: string,
) {
  const locales = Object.keys(localisationRecords) //
    .filter((l) => allowedLocales.includes(l) || l === defaultLocale);
  const sources = locales.map((l) => localisationRecords[l]);

  function recurse<U>(values: U[]): T {
    if (values.every((v) => Array.isArray(v))) {
      return values[0].map((_, i) => recurse(values.map((v) => v?.[i] ?? {})));
    }

    if (values.every((v) => typeof v === 'object' && v !== null)) {
      const keys = new Set(values.flatMap((v) => Object.keys(v || {})));
      const result: Record<string, unknown> = {};

      for (const key of keys) {
        if (key === 'name' || key === 'description') {
          const defaultValue = values[locales.indexOf(defaultLocale)]?.[key];
          if (defaultValue !== undefined) result[key] = defaultValue;

          const localisationKey = `${key}Localizations`;
          const localisationMap: Record<string, unknown> = {};

          for (let i = 0; i < values.length; i++) {
            const current = values[i] as Record<string, unknown> | undefined;
            if (current?.[key] !== undefined && locales[i] !== defaultLocale) {
              localisationMap[locales[i]] = current[key];
            }
          }

          result[localisationKey] = localisationMap;
        } else {
          result[key] = recurse(values.map((v) => v?.[key]));
        }
      }

      return result;
    }

    return values[locales.indexOf(defaultLocale)];
  }

  return recurse(sources);
}

export abstract class SayableCommand extends Command {
  name = '';

  constructor(
    makeOptions: (
      s: typeof say,
    ) => Pick<Command, 'name' | 'description' | 'options'>,
  ) {
    super();

    const localisationRecords = {};
    for (const locale of say.locales) {
      const s = say.clone().activate(locale);
      localisationRecords[locale] = makeOptions(s);
    }

    const options = combineLocalisations(localisationRecords, say.locale);
    Object.assign(this, options);
  }
}

declare module '@buape/carbon' {
  interface BaseInteraction {
    say: typeof say;
  }
}

Object.defineProperty(BaseInteraction.prototype, 'say', {
  get() {
    this[' say'] ??= say.clone();
    if (say.locales.includes(this.rawData.locale))
      this[' say'].activate(this.rawData.locale);
    return this[' say'];
  },
});
