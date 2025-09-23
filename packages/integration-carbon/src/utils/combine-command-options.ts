import { Locale } from '@buape/carbon';

const ALLOWED_LOCALES = Object.values(Locale) as string[];

export function combineCommandOptions(
  // biome-ignore lint/suspicious/noExplicitAny: allow to be anything
  mappedOptions: Record<string, any>,
  baseLocale: string,
) {
  const options = structuredClone(mappedOptions[baseLocale]);
  const availableLocales = Object.keys(mappedOptions) //
    .filter((l) => l !== baseLocale && ALLOWED_LOCALES.includes(l));

  for (const [key, value] of Object.entries(options)) {
    if (key === 'name' || key === 'description') {
      options[`${key}Localizations`] = {};
      for (const locale of availableLocales) {
        const other = mappedOptions[locale][key];
        options[`${key}Localizations`][locale] = other;
      }
      options[`${key}_localizations`] = options[`${key}Localizations`];
    }

    if (Array.isArray(value)) {
      for (const [index, option] of Object.entries(value)) {
        const mapped = { [baseLocale]: option };
        for (const locale of availableLocales) {
          const other = mappedOptions[locale][key][index];
          mapped[locale] = other;
        }

        const combined = combineCommandOptions(mapped, baseLocale);
        options[key][index] = combined;
      }
    }
  }

  return options;
}
