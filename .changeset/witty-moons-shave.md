---
'@saykit/react': minor
---

Replace `<SayScope>` with `createWithSay` and `setSay` on the server, so a route segment establishes its own view instead of inheriting one from a parent that may not have rendered yet
