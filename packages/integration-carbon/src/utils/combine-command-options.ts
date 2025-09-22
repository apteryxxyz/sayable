// @ts-nocheck

// NOTE: This is very hacky and is mostly a proof of concept, it doesn't cover every case where localisation might be needed, but it works

import { Locale } from '@buape/carbon';

const allowedLocales = Object.values(Locale);

export function combineCommandOptions<T extends object>(
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
