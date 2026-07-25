# `@example/saykit-yaml`

The YAML formatter and `.email` transformer used by the
[custom-formatter example](../). Kept as its own package for two reasons.

**It is how you would really ship one.** A formatter or transformer is a plain object matching a
public interface; publishing it as a package is what lets a second project use it.

**A `saykit.config.ts` cannot import it relatively.** `@saykit/config` compiles the config to
`node_modules/.cache/saykit/config/*.cjs` and `require`s it from there, so a relative specifier like
`./saykit/yaml-formatter.js` resolves against the cache directory and fails:

```
Error: Cannot find module './saykit/email-transformer.js'
Require stack:
- .../node_modules/.cache/saykit/config/8c626733dff3e99e.f534e2d42583d906.cjs
```

Bare specifiers resolve normally, because Node walks up from the cache directory and finds the
project's `node_modules`. So custom extensions need to be reachable by package name — a workspace
package, a `file:` dependency, or something published.

## Contents

- `src/formatter.ts` — a YAML `Formatter` (`extension` / `parse` / `stringify`).
- `src/transformer.ts` — a `Transformer` for `.email` templates (`match` / `extract` / `transform`).

Both are explained in the [example's README](../README.md).
