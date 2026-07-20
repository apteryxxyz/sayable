---
"unplugin-saykit": patch
---

Load `.json` catalogues as bare JSON instead of an ESM module.

A `.json` id is interpreted as JSON by whatever runs after the plugin — Rollup's json plugin parses the module code, webpack and rspack give it the `json` module type, and esbuild picks its loader from the extension. Emitting `export default {...}` for those ids produced a JSON syntax error at build time. Non-JSON catalogues, such as `.po`, still get the ESM wrapper.
