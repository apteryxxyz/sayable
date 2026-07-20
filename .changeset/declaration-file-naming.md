---
"@saykit/config": minor
---

Emit catalogue declarations as `{locale}.d.{extension}.ts` instead of `{locale}.{extension}.d.ts`.

Delete any leftover `{locale}.{extension}.d.ts` files after upgrading; they are not migrated automatically, and a stale one will shadow the new declaration.
