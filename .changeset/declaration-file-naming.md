---
"@saykit/config": minor
---

Emit catalogue declarations as `{locale}.d.{extension}.ts` instead of `{locale}.{extension}.d.ts`.

TypeScript resolves an import like `./locales/en.json` by stripping the extension it recognises and looking for `en.d.json.ts`; the `en.json.d.ts` form is only consulted for extensions the resolver does not know about. The old naming therefore worked for `.po` catalogues but was silently ignored for `.json` ones, which fell through to the real file and got the literal object type inferred from its contents instead of the declared `Record<string, string>`.

Existing `{locale}.{extension}.d.ts` files are not migrated automatically: the next extraction writes the new name alongside them, so delete the old ones by hand (`rm src/locales/*.*.d.ts`) to avoid a stale declaration shadowing a `.po` catalogue. Note that declarations for non-JS extensions such as `.po` require `allowArbitraryExtensions` in the consuming project's tsconfig.
