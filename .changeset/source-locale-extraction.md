---
"@saykit/config": minor
"babel-plugin-saykit": minor
"unplugin-saykit": minor
---

Write extraction only to the source locale, add message fallbacks, and add a `clean` command.

Extracted messages are now written to the source locale catalogue only, rather than to every locale. Other locales fall back to the source message when a translation is missing, keeping non-source catalogues focused on real translations. A new `clean` command removes generated catalogue output.
