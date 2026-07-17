---
'@saykit/config': minor
---

Stop auto-generating a `.gitignore` next to catalogue files. SayKit no longer writes or overwrites a `.gitignore` in the output directory, leaving it to you to decide which generated files (e.g. `*.d.ts` locale declarations) to commit or ignore. This makes it possible to commit declaration files so CI can type-check without an extra extraction step.
