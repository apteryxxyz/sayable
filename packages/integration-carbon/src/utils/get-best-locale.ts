export function getBestLocale(
  availableLocales: string[],
  userLocales: string[],
) {
  for (const userLocale of userLocales) {
    let languageMatch: string | undefined;

    for (const availableLocale of availableLocales) {
      if (availableLocale === userLocale) return availableLocale;
      if (availableLocale.startsWith(userLocale.split('-')[0]!))
        languageMatch = availableLocale;
    }

    if (languageMatch) return languageMatch;
  }

  return availableLocales[0]!;
}
