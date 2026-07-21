---
"@saykit/config": patch
---

Stat globbed files instead of using `withFileTypes`, so extraction works under Bun's `node:fs/promises` shim.
